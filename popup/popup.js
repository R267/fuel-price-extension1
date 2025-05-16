document.addEventListener('DOMContentLoaded', function () {
    const startButton = document.getElementById('enterButton');
    const stopButton = document.getElementById('exitButton');
    const tagRunning = document.querySelector('.tag.is-success');
    const tagStopped = document.querySelector('.tag.is-danger');

    let currentStatus = 'running'; // дефолтне значення

    // Запит до background.js про поточний статус
    chrome.runtime.sendMessage({ action: 'getStatus' }, function (response) {
        currentStatus = response.status || 'running';
        updateStatusUI(currentStatus);
    });

    // Обробник кнопки Start
    startButton.addEventListener('click', function () {
        if (currentStatus === 'stopped') {
            chrome.windows.create({
                url: chrome.runtime.getURL('pages/main.html'),
                type: 'popup',
                width: 800,
                height: 600
            });
        }
    });

    // Обробник кнопки Stop
    stopButton.addEventListener('click', function () {
        if (currentStatus === 'stopped') {
            window.close();
        }
    });

    // Клік на Running → запуск
    tagRunning.addEventListener('click', function () {
        chrome.runtime.sendMessage({ action: 'setStatus', status: 'running' });
        currentStatus = 'running';
        updateStatusUI('running');
    });

    // Клік на Stopped → зупинка
    tagStopped.addEventListener('click', function () {
        chrome.runtime.sendMessage({ action: 'setStatus', status: 'stopped' });
        currentStatus = 'stopped';
        updateStatusUI('stopped');
    });

    function updateStatusUI(status) {
        if (status === 'stopped') {
            tagStopped.classList.add('is-light');
            tagRunning.classList.remove('is-light');
            startButton.disabled = false;
            stopButton.disabled = false;
        } else {
            tagRunning.classList.add('is-light');
            tagStopped.classList.remove('is-light');
            startButton.disabled = true;
            stopButton.disabled = true;
        }
    }
});
