import express from 'express'; // express를 import
import path from 'path';
import { execSync } from 'child_process';  // child_process 모듈을 import
import { fileURLToPath } from 'url';  // ES 모듈에서 현재 파일의 경로를 가져오기 위해 필요
import fetch from 'node-fetch';  // ES 모듈 방식으로 import
import dotenv from 'dotenv';  // dotenv 패키지 사용
import pg from 'pg';  // pg를 default로 가져오기
const { Client } = pg;  // Client를 추출

// 환경 변수 로드
dotenv.config();

const app = express();  // express 앱을 정의해야 합니다.
const port = 3000;

// PostgreSQL 클라이언트 설정
const client = new Client({
    user: process.env.DB_USER,    // .env 파일에서 설정한 DB_USER
    host: process.env.DB_HOST,    // .env 파일에서 설정한 DB_HOST
    database: process.env.DB_NAME,  // .env 파일에서 설정한 DB_NAME
    password: process.env.DB_PASSWORD,  // .env 파일에서 설정한 DB_PASSWORD
    port: process.env.DB_PORT,    // .env 파일에서 설정한 DB_PORT
});

// PostgreSQL 클라이언트 연결
client.connect()
    .then(() => {
        console.log("Connected to the database");
    })
    .catch((err) => {
        console.error("Connection error", err.stack);
    });

// 요청 본문을 JSON 형식으로 파싱하는 미들웨어
app.use(express.json());

// VM 데이터를 조회하는 API 추가
app.get('/vm-data', async (req, res) => {
    const deployMethod = req.query.deploy_method;  // deploy_method 값 받기

    try {
        // PostgreSQL에서 VM 데이터를 조회하는 SQL 쿼리
        let query = 'SELECT * FROM VM';  // 기본 쿼리
        let values = [];

        if (deployMethod) {
            query += ' WHERE deploy_method = $1';  // deploy_method로 필터링
            values.push(deployMethod);
        }

        const result = await client.query(query, values);  // 조건에 맞는 쿼리 실행
        res.json(result.rows);  // 결과를 클라이언트에 JSON 형태로 응답
    } catch (error) {
        console.error('Error fetching VM data:', error);
        res.status(500).json({ message: 'Error fetching VM data' });
    }
});


// import.meta.url로 현재 파일 경로를 가져오고, 이를 fileURLToPath로 변환
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// public 폴더를 정적 파일로 제공
app.use(express.static(path.join(__dirname, 'public')));

// 서버에서 HTML 파일 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', '/webpage/index.html'));
});

// GitHub Action을 트리거하는 API 엔드포인트
app.post('/trigger-github-action', async (req, res) => {
    const workflowFileName = req.body.workflow;  // 클라이언트에서 전달된 workflow 이름

    // workflowFileName이 없으면 오류 응답을 보냅니다.
    if (!workflowFileName) {
        return res.status(400).json({ message: 'Workflow file name is required!' });
    }

    const token = process.env.GITHUB_TOKEN;  // 환경 변수에서 GitHub 토큰 가져오기

    // GitHub 토큰이 없으면 오류 응답을 보냅니다.
    if (!token) {
        console.error('GitHub token is missing or invalid!');
        return res.status(500).json({ message: 'GitHub token is missing or invalid!' });
    }

    const repoOwner = "inaeeeee";  // GitHub 사용자명
    const repoName = "Kubespray";  // GitHub 저장소명

    // GitHub API의 URL을 정의합니다.
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowFileName}/dispatches`;

    // GitHub Action을 트리거하기 위한 데이터
    const data = {
        "ref": "main"  // 실행할 브랜치 이름 (main 브랜치)
    };

    try {
        // GitHub API에 POST 요청을 보냅니다.
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        // GitHub API 응답이 204(No Content)인 경우
        if (response.status === 204) {
            return res.json({ message: 'GitHub Action triggered successfully!' });
        }

        // 응답이 실패한 경우, 응답 내용을 처리합니다.
        const errorResponse = await response.json();
        console.error('GitHub Action error:', errorResponse);
        return res.status(response.status).json({
            message: `GitHub Action failed: ${errorResponse.message || 'Unknown error'}`
        });

    } catch (error) {
        // 오류가 발생한 경우 처리
        console.error('Error triggering GitHub Action:', error);
        return res.status(500).json({ message: 'Failed to trigger GitHub Action.' });
    }
});


// Stop-Service API - 서비스 중지 및 DB 데이터 삭제
app.post('/stop-service', async (req, res) => {
    const deployMethod = req.body.deploy_method;  // 클라이언트에서 전달된 deploy_method 값
    const serviceName = req.body.service_name;

    if (!deployMethod) {
        return res.status(400).json({ message: 'Deploy method is required to stop the service.' });
    }

    try {
        // 1. deploy_method에 해당하는 IP 주소와 호스트명 조회 (vm_data 테이블 사용)
        const serviceQuery = `
            SELECT ip_address, hostname
            FROM VM
            WHERE deploy_method = $1
        `;
        const result = await client.query(serviceQuery, [deployMethod]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: `No services found for deploy method: ${deployMethod}` });
        }

        // 2. 각 IP에 대해 서비스 종료 명령 실행
        const stopServiceCommand = process.env.stopServiceCommand;  // 환경 변수에서 종료 명령 불러오기
        for (const row of result.rows) {
            const remoteHost = row.ip_address;  // 서비스가 배포된 IP 주소
            const stopCommand = stopServiceCommand.replace("{serviceName}", serviceName);  // deploy_method를 서비스 이름으로 사용

            console.log(`Stopping service on IP: ${remoteHost}`);

            // SSH를 통해 원격 서버에서 명령어 실행
            try {
                execSync(`ssh ${remoteHost} '${stopCommand}'`, { stdio: 'inherit' });
                console.log(`Service stopped successfully on IP: ${remoteHost}`);
            } catch (error) {
                console.error(`Error stopping service on IP: ${remoteHost}`, error.message);
            }
        }

    } catch (error) {
        console.error('Error fetching services and IPs from database:', error.message);
        return res.status(500).json({ message: 'Failed to fetch services and IPs from the database.' });
    }

    try {
        // 3. DB에서 deploy_method에 해당하는 데이터 삭제
        let deleteQuery = 'DELETE FROM VM WHERE deploy_method = $1';  // deploy_method에 해당하는 데이터만 삭제
        let values = [deployMethod];  // 전달된 deploy_method 값을 쿼리에 전달

        await client.query(deleteQuery, values);

        // 서비스 중지 및 DB 삭제 완료 메시지
        res.json({ message: `Service stopped for deploy method ${deployMethod} on all corresponding IPs and data deleted successfully!` });
    } catch (error) {
        console.error('Error stopping service and deleting data:', error);
        return res.status(500).json({ message: 'Failed to stop the service and delete the data.' });
    }
});


// 서버 시작
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
