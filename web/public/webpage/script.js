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
    { id: 'VM_Button', workflow: 'playbook/playbook.yml' },
    { id: 'Container_Button', workflow: 'playbook/container_playbook.yml' },
    { id: 'K8S_Button', workflow: 'playbook/k8s_playbook.yml' },
    { id: 'Workload_Button', workflow: 'playbook/workload_playbook.yml' },
    { id: 'DB_Button', workflow: 'playbook/db_playbook.yml' },
    { id: 'Storage_Button', workflow: 'playbook/storage_playbook.yml' },
    { id: 'Backup_Button', workflow: 'playbook/backup_playbook.yml' },
    { id: 'Monitor_Button', workflow: 'playbook/monitor_playbook.yml' },
    { id: 'DR_Button', workflow: 'playbook/dr_playbook.yml' },
    { id: 'Test_Button', workflow: 'test.yml' }
];

// 각 버튼에 대해 클릭
buttonsConfig.forEach(config => {
    const button = document.getElementById(config.id);
    
    if (button) {
        button.addEventListener('click', function() {
            triggerGitHubAction(config.workflow);
        });
    } else {
        console.warn(`Button with ID ${config.id} not found.`);
    }
});


// VM 데이터 로드 함수 (로딩 메시지 및 시간 표시)
function loadVMData() {
    const vmDataContainer = document.getElementById('vm-data-container');
    
    if (vmDataContainer) {
        // // 로딩 상태 및 시간 표시
        // let startTime = Date.now();
        // const loadingMessage = document.createElement('p');
        // loadingMessage.textContent = '데이터를 가져오는 중입니다... 0초';
        // vmDataContainer.innerHTML = '';  // 기존 내용을 지우고 로딩 메시지 추가
        // vmDataContainer.appendChild(loadingMessage);

        // // 시간 업데이트 (1초마다)
        // const interval = setInterval(() => {
        //     const elapsedTime = Math.floor((Date.now() - startTime) / 1000);  // 경과 시간 (초 단위)
        //     loadingMessage.textContent = `데이터를 가져오는 중입니다... ${elapsedTime}초`;
        // }, 1000);

        // // 타임아웃 설정 (30초 후)
        // const timeout = setTimeout(() => {
        //     clearInterval(interval);  // 시간 업데이트 중지
        //     loadingMessage.textContent = '데이터를 가져오는 중입니다... Timeout';  // 타임아웃 메시지
        //     vmDataContainer.appendChild(loadingMessage);  // 메시지 추가
        // }, 30000);  // 30초 후 타임아웃

        // fetch 요청
        fetch('/vm-data')
            .then(response => response.json())
            .then(data => {
                // clearInterval(interval);  // 데이터가 성공적으로 로드되면 시간 업데이트 중지
                // clearTimeout(timeout);  // 타임아웃 취소

                if (data && data.length > 0) {
                    // VM 데이터를 HTML로 변환하여 vm-data-container에 삽입
                    const table = document.createElement('table');
                    table.style.width = '100%';
                    table.style.borderCollapse = 'collapse';
                    table.style.color = '#ffffff';  // 흰색 글자

                    // 테이블 헤더 생성
                    const header = table.createTHead();
                    const headerRow = header.insertRow();
                    const headers = ['ID', 'Workspace ID', 'Hostname', 'IP Address', 'Status', 'Created At'];
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
                    vmDataContainer.innerHTML = '데이터가 없습니다';
                }
            })
            .catch(error => {
                // clearInterval(interval);  // 에러가 발생하면 시간 업데이트 중지
                // clearTimeout(timeout);  // 타임아웃 취소
                console.error('Error loading VM data:', error);
                vmDataContainer.innerHTML = '데이터를 가져오는 데 실패했습니다.';
            });
    }
}

// 페이지 로드 시 VM 데이터 로드
document.addEventListener('DOMContentLoaded', loadVMData);
