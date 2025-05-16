let extensionStatus = 'running';

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['extensionStatus'], (result) => {
        extensionStatus = result.extensionStatus || 'running';
        console.log('[SW] Status after installation:', extensionStatus);
    });

    scheduleDailyMidnightAlarm();
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['extensionStatus'], (result) => {
        extensionStatus = result.extensionStatus || 'running';
        console.log('[SW] Starting status:', extensionStatus);
    });

    scheduleDailyMidnightAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dailyUpdate') {
        console.log('[SW] 🕛 Starting status:Update launched at midnight');

        chrome.storage.local.get(['extensionStatus'], (result) => {
            if (result.extensionStatus === 'running') {
                fetch('https://index.minfin.com.ua/ua/markets/fuel/')
                    .then(res => res.text())
                    .then(html => {
                        console.log('[SW] 🔄 Data updated successfully');
                        // Тут можна зробити подальші дії (парсинг, збереження тощо)
                    })
                    .catch(err => {
                        console.error('[SW] ❌ Update error:', err);
                    });
            }
        });
    }
});

function scheduleDailyMidnightAlarm() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // найближча північ

    const delayInMinutes = (midnight - now) / 1000 / 60;

    chrome.alarms.create('dailyUpdate', {
        delayInMinutes,
        periodInMinutes: 1440
    });

    console.log('[SW] 🔔 The update is scheduled for', Math.round(delayInMinutes), 'min');
}

// Отримання/встановлення статусу з popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getStatus') {
        chrome.storage.local.get(['extensionStatus'], (result) => {
            sendResponse({ status: result.extensionStatus || 'running' });
        });
        return true;
    }

    if (request.action === 'setStatus') {
        chrome.storage.local.set({ extensionStatus: request.status }, () => {
            console.log('[SW] ✅ Status updated to:', request.status);
        });
    }
});
