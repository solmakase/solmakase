// GitHub Action 트리거 함수
function triggerGitHubAction(workflowFileName) {
    fetch(`/trigger-github-action?workflow=${workflowFileName}`, {
        method: 'POST'
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
    { id: 'Web_Button', workflow: 'playbook/playbook.yml' },
    { id: 'WebStop_Button', workflow: 'stop-service' },
    { id: 'K8s_Button', workflow: 'playbook/container_playbook.yml' },
    { id: 'K8sStop_Button', workflow: 'stop-service' }, // 올바르게 수정
    { id: 'LB_Button', workflow: 'playbook/k8s_playbook.yml' },
    { id: 'LBStop_Button', workflow: 'stop-service' },
    { id: 'DB_Button', workflow: 'test.yml' },
    { id: 'DBStop_Button', workflow: 'stop-service' }
];


// 각 버튼에 대해 클릭 이벤트 리스너 추가
buttonsConfig.forEach(config => {
    const button = document.getElementById(config.id);
    
    if (button) {
        button.addEventListener('click', () => {
            // Stop 버튼 클릭 시 서버에 서비스 중지 및 DB 데이터 삭제 요청
            if (config.id.includes('Stop')) {
                stopServiceAndDeleteData();
            } else {
                // GitHub Action을 트리거하는 함수 호출
                triggerGitHubAction(config.workflow);
                
                // GitHub Action 후 VM 데이터도 불러오기
                loadServiceData(config.workflow); // 각 서비스에 맞는 데이터를 로드
            }
        });
    } else {
        console.warn(`Button with ID ${config.id} not found.`);
    }
});


// 서비스 중지 및 DB 데이터 삭제 함수
function stopServiceAndDeleteData() {
    showStatusMessage('Stopping service and deleting data...', 'info');
    
    fetch('/stop-service', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showStatusMessage(data.message, 'success');
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
function loadServiceData(workflow) {
    const vmDataContainer = document.getElementById('vm-data-container');
    
    if (vmDataContainer) {
        // 로딩 메시지 표시
        vmDataContainer.innerHTML = 'Loading VM data...';

        // fetch 요청: 각 서비스에 맞는 VM 데이터 요청
        fetch(`/vm-data?service=${workflow}`)  // 예시: 서비스에 맞는 쿼리 추가
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

                    // 테이블 본문에 VM 데이터 삽입
                    const tbody = table.createTBody();
                    data.forEach(vm => {
                        const row = tbody.insertRow();
                        Object.values(vm).forEach(value => {
                            const cell = row.insertCell();
                            cell.style.border = '1px solid #ccc';
                            cell.style.padding = '8px';
                            cell.textContent = value;
                        });
                    });

                    // 기존의 내용 지우고 테이블을 추가
                    vmDataContainer.innerHTML = '';  // 기존 내용 제거
                    vmDataContainer.appendChild(table);  // 테이블 추가
                } else {
                    // 데이터가 없으면 "데이터가 없습니다" 출력
                    vmDataContainer.innerHTML = 'No VM data available';
                }
            })
            .catch(error => {
                console.error('Error loading VM data:', error);
                vmDataContainer.innerHTML = 'Failed to load VM data.';
            });
    }
}


// 페이지 로드 시 VM 데이터 로드
document.addEventListener('DOMContentLoaded', loadVMData);