import express from 'express'; // express를 import
import path from 'path';
import { execSync } from 'child_process';  // child_process 모듈을 import
import { exec } from 'child_process';  // exec을 import
import { fileURLToPath } from 'url';  // ES 모듈에서 현재 파일의 경로를 가져오기 위해 필요
import fetch from 'node-fetch';  // ES 모듈 방식으로 import
import dotenv from 'dotenv';  // dotenv 패키지 사용
import pg from 'pg';  // pg를 default로 가져오기
const { Client } = pg;  // Client를 추출

// 환경 변수 로드
dotenv.config();

// 필수 환경 변수 체크
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.GITHUB_TOKEN) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const app = express();  // express 앱을 정의해야 합니다.
const port = process.env.PORT || 3000; // 포트 번호 환경 변수로 설정

// PostgreSQL 클라이언트 설정
const client = new Client({
    user: process.env.DB_USER,    // .env 파일에서 설정한 DB_USER
    host: process.env.DB_HOST,    // .env 파일에서 설정한 DB_HOST
    database: process.env.DB_NAME,  // .env 파일에서 설정한 DB_NAME
    password: process.env.DB_PASSWORD,  // .env 파일에서 설정한 DB_PASSWORD
    port: process.env.DB_PORT,    // .env 파일에서 설정한 DB_PORT
});

// PostgreSQL 클라이언트 연결
const connectToDatabase = async () => {
    try {
        await client.connect();
        console.log("Connected to the database");
    } catch (err) {
        console.error("Connection error", err.stack);
        process.exit(1); // 데이터베이스 연결 실패 시 종료
    }
};
connectToDatabase();

// 요청 본문을 JSON 형식으로 파싱하는 미들웨어
app.use(express.json());

// VM 데이터를 조회하는 API 추가
app.get('/vm-data', async (req, res) => {
    const deployMethod = req.query.deploy_method;  // deploy_method 값 받기

    try {
        // PostgreSQL에서 VM 데이터를 조회하는 SQL 쿼리
        let query = 'SELECT id, template_id, hostname, ip_address, status, deploy_method, created_at FROM vm';
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

app.post('/trigger-github-action', async (req, res) => {
    const { workflowFileName, repoName } = req.body;

    // 필수 값 확인
    if (!workflowFileName || !repoName) {
        return res.status(400).json({ message: 'Workflow file name and repoName are required!' });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error('GitHub token is missing!');
        return res.status(500).json({ message: 'GitHub token is missing!' });
    }

    // repository owner 매핑
    const repoMapping = {
        'ansible-install-cd.yml': 'solmakase',
        'default': 'inaeeeee'
    };
    let repoOwner = repoMapping[workflowFileName] || repoMapping['default'];

    // API 요청 URL 검증 (디버깅용)
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowFileName}/dispatches`;
    console.log(`🔹 Triggering workflow: ${workflowFileName} in ${repoOwner}/${repoName}`);
    console.log(`🔹 API URL: ${url}`);

    const data = { "ref": "main" }; // 실행할 브랜치 이름 (기본: main)

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`, // ✅ 최신 GitHub API 인증 방식 적용
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.status === 204) {
            console.log('✅ GitHub Action triggered successfully!');
            return res.json({ message: 'GitHub Action triggered successfully!' });
        } else {
            // 응답이 JSON이 아닐 수도 있으므로 예외 처리
            let errorMessage = 'Unknown error';
            try {
                const errorResponse = await response.json();
                errorMessage = errorResponse.message || 'Unknown error';
            } catch (parseError) {
                console.error('❌ Failed to parse error response:', parseError);
            }

            console.error('❌ GitHub Action error:', errorMessage);
            return res.status(response.status).json({ message: `GitHub Action failed: ${errorMessage}` });
        }
    } catch (error) {
        console.error('❌ Error triggering GitHub Action:', error);
        return res.status(500).json({ message: 'Failed to trigger GitHub Action.' });
    }
});


const stopServiceOnHost = (remoteHost, stopServiceCommand) => {
    return new Promise((resolve, reject) => {
        // exec 명령을 비동기로 실행
        const process = exec(`ssh ${remoteHost} '${stopServiceCommand}'`, { timeout: 30000 }); // 30초 타임아웃

        process.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        process.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        process.on('close', (code) => {
            if (code === 0) {
                console.log(`Service stopped successfully on IP: ${remoteHost}`);
                resolve(); // 성공적으로 종료되었을 때
            } else {
                reject(`Process failed with code: ${code}`); // 오류가 발생했을 때
            }
        });

        process.on('error', (err) => {
            reject(`Error executing command: ${err.message}`); // 명령 실행 중 오류가 발생했을 때
        });
    });
};

// 'stop-service' 엔드포인트에서 서비스 중지 요청 처리
app.post('/stop-service', async (req, res) => {
    const deployMethod = req.body.deploy_method;  // 클라이언트에서 전달된 deploy_method 값
    const serviceName = req.body.service_name;  // 클라이언트에서 전달된 service_name 값

    if (!deployMethod) {
        return res.status(400).json({ message: 'Deploy method is required to stop the service.' });
    }

    console.log('Deploy method:', deployMethod);  // deploy_method 값 확인
    // 1. deploy_method에 해당하는 IP 주소와 호스트명 조회 (vm_data 테이블 사용)
    const serviceQuery = `
        SELECT ip_address, hostname
        FROM vm
        WHERE deploy_method = $1
    `;

    // try {
    //     const result = await client.query(serviceQuery, [deployMethod]);
    //     console.log('Query result:', result);  // 쿼리 결과 확인

    //     if (result.rows.length === 0) {
    //         return res.status(404).json({ message: `No services found for deploy method: ${deployMethod}` });
    //     }

    //     // 2. 각 IP에 대해 서비스 종료 명령 실행
    //     let stopServiceCommand = process.env.stopServiceCommand;  // 환경 변수에서 종료 명령 불러오기

    //     if (deployMethod === "docker") {
    //         stopServiceCommand = `docker stop $(docker ps -q)`;  // docker 컨테이너 중지 명령
    //     } else {
    //         stopServiceCommand = `kubectl delete pods --all`;  // kubectl을 사용하여 모든 pod 삭제
    //     } 

    //     // 3. 각 IP에 대해 비동기적으로 서비스 종료 명령 실행 및 30초 타임아웃 처리
    //     const stopServicePromises = result.rows.map(row => {
    //         const remoteHost = row.ip_address;  // 서비스가 배포된 IP 주소
    //         console.log(`Stopping service on IP: ${remoteHost}`);
    //         return stopServiceOnHost(remoteHost, stopServiceCommand);  // 서비스 중지 함수 호출
    //     });

    //     // 모든 서비스 중지 명령이 완료될 때까지 기다림
    //     await Promise.all(stopServicePromises);

    // } catch (error) {
    //     console.error('Error fetching services and IPs from database:', error.message);
    //     return res.status(500).json({ message: 'Failed to fetch services and IPs from the database.' });
    // }

    try {
        // 4. DB에서 deploy_method에 해당하는 데이터 삭제
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
