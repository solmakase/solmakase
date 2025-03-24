# 프로젝트 이름: Solmakase

이 프로젝트는 Node.js와 Express를 사용하여 GitHub Action을 트리거하는 API 서버를 구현한 것입니다.

## 필수 요구 사항

- Node.js (v14 이상 권장)
- npm (Node Package Manager)

## 1. 프로젝트 클론 또는 다운로드

프로젝트를 다운로드하거나 GitHub에서 클론합니다:

npm install express node-fetch dotenv

npm install pg


## 2. 실행
<<<<<<< HEAD
.env file:
    - token 변경
    - ip address 변경
    - Service Command 명령어 변경 
    
=======
.env file - token 변경
app.js 파일 - const remoteHost = "root@192.168.30.32"; // ip 변경하기
app.js 파일 - const stopServiceCommand = 'kubectl delete pod nginx-pod --namespace=default';  // 서비스 이름을 실제로 맞게 수정
app.js 파일 - const deleteQuery = 'DELETE FROM vm_data'; 삭제할 테이블 이름 수정
>>>>>>> ecd8f39 (initial commit)
# docker stop: 시스템 명령어(쉘 명령어)를 실행하고, 그 결과를 동기적으로 기다리는 명령어

npm start

or 

node app.js
