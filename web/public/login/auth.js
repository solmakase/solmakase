// 로그인 폼 제출 이벤트
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // 기본 폼 제출 방지

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    // 예시: 로그인 유효성 검사 (사용자 이름과 비밀번호가 같을 경우만 로그인 성공)
    if (username === 'admin' && password === '1234') {
        alert('로그인 성공!');
        // 로그인 성공 후 다른 페이지로 이동 (예시)
        // window.location.href = '/home';
    } else {
        errorMessage.textContent = '사용자 이름 또는 비밀번호가 잘못되었습니다.';
    }
});
