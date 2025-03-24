function triggerGitHubAction(workflowFileName, repoName) {
    fetch('/trigger-github-action', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            workflowFileName: workflowFileName,  // workflowFileName을 본문에 포함
            repoName: repoName  // repoName을 본문에 포함
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showStatusMessage(data.message, 'success');
        } else {
            showStatusMessage('Something went wrong! Please try again.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showStatusMessage('Failed to trigger GitHub Action. Please check the console for details.', 'error');
    });
}


// 상태 메시지를 화면에 표시하는 함수
function showStatusMessage(message, type) {
    const statusContainer = document.getElementById('status-message');
    
    if (statusContainer) {
        statusContainer.textContent = message;
        statusContainer.style.color = type === 'success' ? 'green' : 'red';
    } else {
        alert(message);  // fallback
    }
}

// 버튼 클릭 이벤트 리스너 추가
const buttonsConfig = [
    { id: 'Ansible_Button', repo: 'Ansible', workflow: 'ansible-workflow.yml', deploy_method: 'Ansible' },
    { id: 'AnsibleStop_Button', repo: 'Ansible', workflow: 'stop-service', deploy_method: 'Ansible', service_name: 'ansible' },
    { id: 'Docker_Button', repo: 'Docker', workflow: 'main.yml', deploy_method: 'Docker' },
    { id: 'DockerStop_Button', repo: 'Docker', workflow: 'stop-service', deploy_method: 'Docker', service_name: 'docker' },
    { id: 'K8s_Button', repo: 'Kubespray', workflow: 'lb-web.yml', deploy_method: 'Kubernetes' },
    { id: 'K8sStop_Button', repo: 'Kubespray', workflow: 'stop-service', deploy_method: 'Kubernetes', service_name: 'kubernetes' },
];

// 버튼 클릭 이벤트 리스너 추가
buttonsConfig.forEach(config => {
    const button = document.getElementById(config.id);
    
    if (button) {
        button.addEventListener('click', () => {
            if (isStopButton(config.id)) {
                stopServiceAndDeleteData(config.deploy_method);  // deploy_method 전달
            } else {
                triggerGitHubAction(config.workflow, config.repo);
                loadServiceData(config.workflow, config.deploy_method);
            }
        });
    } else {
        console.warn(`Button with ID ${config.id} not found.`);
    }
});

// Stop 버튼 여부 확인 함수
function isStopButton(buttonId) {
    return buttonId.includes('Stop');
}

// 서비스 중지 및 DB 데이터 삭제 함수
function stopServiceAndDeleteData(deployMethod) {
    showStatusMessage(`Stopping service and deleting ${deployMethod} data...`, 'info');
    
    fetch('/stop-service', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deploy_method: deployMethod })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showStatusMessage(data.message, 'success');
            // 서비스 중지 후 해당 데이터를 다시 로드하여 화면 갱신
            loadServiceData('ansible-workflow.yml', 'Ansible');
            loadServiceData('main.yml', 'Docker');
            loadServiceData('lb-web.yml', 'Kubernetes');  // Kubernetes 데이터도 다시 로드
        } else {
            showStatusMessage('Failed to stop service and delete data.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showStatusMessage('Failed to stop service and delete data. Please check the console for details.', 'error');
    });
}

// VM 데이터 로드 함수 (로딩 메시지 및 시간 표시)
function loadServiceData(workflow, deployMethod = null) {
    // 각 서비스에 맞는 컨테이너 선택
    let serviceDataContainerId = '';
    switch (deployMethod) {
        case 'Ansible':
            serviceDataContainerId = 'Ansible-service-data-container';
            break;
        case 'Docker':
            serviceDataContainerId = 'Docker-service-data-container';
            break;
        case 'Kubernetes':
            serviceDataContainerId = 'K8s-service-data-container';
            break;
        default:
            console.warn('Unknown deploy method:', deployMethod);
            return;
    }
    
    const serviceDataContainer = document.getElementById(serviceDataContainerId);
    
    if (serviceDataContainer) {
        // 로딩 메시지 표시
        serviceDataContainer.innerHTML = 'Loading VM data...';

        // fetch 요청: 각 서비스에 맞는 vm_data 요청
        let url = `/vm-data?service=${workflow}`;
        if (deployMethod) {
            url += `&deploy_method=${deployMethod}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const table = document.createElement('table');
                    table.style.width = '100%';
                    table.style.borderCollapse = 'collapse';
                    table.style.color = '#ffffff';  // 흰색 글자

                    // 테이블 헤더 생성
                    const header = table.createTHead();
                    const headerRow = header.insertRow();
                    const headers = ['Template_id', 'Hostname', 'IP Address', 'Status', 'Deploy_method', 'Created At'];
                    headers.forEach(headerText => {
                        const th = document.createElement('th');
                        th.style.border = '1px solid #ccc';
                        th.style.padding = '8px';
                        th.textContent = headerText;
                        headerRow.appendChild(th);
                    });

                    // 테이블 본문에 vm_data 삽입
                    const tbody = table.createTBody();
                    data.forEach(VM => {
                        const row = tbody.insertRow();
                        Object.values(VM).forEach(value => {
                            const cell = row.insertCell();
                            cell.style.border = '1px solid #ccc';
                            cell.style.padding = '8px';
                            cell.textContent = value;
                        });
                    });

                    // 기존의 내용 지우고 테이블을 추가
                    serviceDataContainer.innerHTML = '';  // 기존 내용 제거
                    serviceDataContainer.appendChild(table);  // 테이블 추가
                } else {
                    // 데이터가 없으면 "데이터가 없습니다" 출력
                    serviceDataContainer.innerHTML = 'No VM data available';
                }
            })
            .catch(error => {
                console.error('Error loading VM data:', error);
                serviceDataContainer.innerHTML = 'Failed to load VM data.';
            });
    }
}

// 페이지 로드 시 자동으로 각 서비스 데이터 로드
document.addEventListener('DOMContentLoaded', () => {
    loadServiceData('ansible-workflow.yml', 'Ansible');
    loadServiceData('main.yml', 'Docker');
    loadServiceData('lb-web.yml', 'Kubernetes');  // Kubernetes 데이터 로드
});
