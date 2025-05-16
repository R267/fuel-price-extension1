async function fetchFuelData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.text();
    } catch (error) {
        console.error('Error fetching fuel data:', error);
        return null;
    }
}

const translationsMap = {
    'Ціна': 'Price',
    'грн': 'UAH',
    'грн.': 'UAH',
    'Середня': 'Average',
    'Середня ціна': 'Average Price',
    'Середні ціни на пальне': 'Average fuel prices',
    'по Україні': 'in Ukraine',
    'на': 'as of',
    'Зміна': 'Change',
    'Дата': 'Date',
    'Вартість': 'Cost',
    'Графік': 'Chart',
    'Оператори': 'Operators',
    'Регіони': 'Regions',
    'Україна': 'Ukraine',
    'Область': 'Region',
    'Марка': 'Brand',
    'Трейдер': 'Trader',
    'Вид палива': 'Fuel type',
    'Бензин A-95 преміум': 'Premium A-95 Petrol',
    'Бензин A-95': 'A-95 Petrol',
    'Бензин A-92': 'A-92 Petrol',
    'Бензин': 'Petrol',
    'Дизельне паливо': 'Diesel fuel',
    'Дизель': 'Diesel',
    'Газ автомобільний': 'Automotive gas (LPG)',
    'Газ': 'Gas',
};

function translateText(text, lang = 'en') {
    const map = lang === 'en'
        ? translationsMap
        : Object.fromEntries(Object.entries(translationsMap).map(([ua, en]) => [en, ua]));

    let result = text;
    const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedKey}\\b`, 'gi');
        result = result.replace(regex, match => {
            const replacement = map[key];
            return match[0] === match[0].toUpperCase()
                ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
                : replacement;
        });
    }

    return result;
}

function translateHTMLContent(container, lang = 'en') {
    if (!container) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);

    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeValue.trim()) {
            node.nodeValue = translateText(node.nodeValue, lang);
        }
    }
}

function extractImportantContent(htmlString, lang = 'en') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    doc.querySelectorAll('script').forEach(script => {
        const content = script.textContent || '';
        if (
            content.includes('disablePlayerDetachOnCreativeLoad') ||
            content.includes('googletag') ||
            content.includes('BidmaticLoader')
        ) {
            script.remove();
        }
    });

    const headings = doc.querySelectorAll('h1, h2, h3');
    const tables = doc.querySelectorAll('table');
    const graphs = doc.querySelectorAll('.index-chart');
    const importantSections = [];

    headings.forEach(h => {
        importantSections.push(`<h3>${translateText(h.textContent, lang)}</h3>`);
    });

    tables.forEach(table => {
        const clonedTable = table.cloneNode(true);
        clonedTable.querySelectorAll('th, td').forEach(cell => {
            cell.textContent = translateText(cell.textContent, lang);
        });
        importantSections.push(clonedTable.outerHTML);
    });

    graphs.forEach(graph => {
        importantSections.push(graph.outerHTML);
    });

    return importantSections.join('<br><br>');
}

function detectUserLang() {
    const lang = navigator.language || navigator.userLanguage;
    return lang.toLowerCase().startsWith('uk') ? 'ua' : 'en';
}

function setupFuelPrices() {
    const title = document.getElementById('fuelPricesTitle');
    const listContainer = document.getElementById('fuelPricesList');
    const userLang = detectUserLang();

    title.addEventListener('click', async () => {
        if (listContainer.innerHTML.trim() !== '') {
            listContainer.innerHTML = '';
            return;
        }

        const links = [
            { name: "Average prices in Ukraine", url: "https://index.minfin.com.ua/ua/markets/fuel/" },
            { name: "By regions of Ukraine", url: "https://index.minfin.com.ua/ua/markets/fuel/reg/" },
            { name: "By leading operators", url: "https://index.minfin.com.ua/ua/markets/fuel/tm/" },
            { name: "Detailed information about the fuel market in Ukraine", url: "https://index.minfin.com.ua/ua/markets/fuel/detail/" }
        ];

        const ul = document.createElement('ul');

        for (const link of links) {
            const li = document.createElement('li');
            li.textContent = link.name;
            Object.assign(li.style, {
                cursor: 'pointer',
                textDecoration: 'underline',
                color: 'blue'
            });

            li.addEventListener('click', async () => {
                listContainer.innerHTML = 'Loading...';

                const htmlContent = await fetchFuelData(link.url);
                if (htmlContent) {
                    const importantContent = extractImportantContent(htmlContent, userLang);

                    listContainer.innerHTML = `
                        <style>
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 1rem;
                            }
                            table, th, td {
                                border: 1px solid #ccc;
                            }
                            th, td {
                                padding: 8px;
                                text-align: left;
                            }
                            th {
                                background-color: #f2f2f2;
                            }
                        </style>
                        <button id="backButton" style="margin-bottom: 1rem; background-color: #00d1b2; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;">
                            ⬅ Back
                        </button>
                        <div style="margin-top: 1rem;">${importantContent}</div>
                    `;

                    document.getElementById('backButton').addEventListener('click', () => {
                        listContainer.innerHTML = '';
                    });

                    const graphs = listContainer.querySelectorAll('.index-chart');
                    graphs.forEach(graph => {
                        graph.style.maxWidth = '100%';
                        graph.style.height = 'auto';
                        graph.style.margin = '10px 0';
                        graph.style.border = '1px solid #ddd';
                        graph.style.borderRadius = '5px';
                    });
                } else {
                    listContainer.innerHTML = 'Failed to load content.';
                }
            });

            ul.appendChild(li);
        }

        listContainer.appendChild(ul);
    });
}

function setupFuelOperators() {
    const title = document.getElementById('fuelOperatorsTitle');
    const listContainer = document.getElementById('fuelOperatorsList');

    const operatorsData = [
        { rank: 1, name: 'OKKO', reputation: 'Excellent' },
        { rank: 2, name: 'WOG', reputation: 'Excellent' },
        { rank: 3, name: 'Shell', reputation: 'Very Good' },
        { rank: 4, name: 'Ukrnafta', reputation: 'Good' },
        { rank: 5, name: 'SOCAR', reputation: 'Very Good' },
        { rank: 6, name: 'Glusco', reputation: 'Average' },
        { rank: 7, name: 'KLO', reputation: 'Good' },
        { rank: 8, name: 'ANP', reputation: 'Average' },
        { rank: 9, name: 'Motto', reputation: 'Average' },
        { rank: 10, name: 'BRSM-Nafta', reputation: 'Below Average' }
    ];

    title.addEventListener('click', () => {
        if (listContainer.innerHTML.trim() !== '') {
            listContainer.innerHTML = '';
            return;
        }

        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Operator Name</th>
                        <th>Reputation</th>
                    </tr>
                </thead>
                <tbody>
        `;

        operatorsData.forEach(op => {
            tableHTML += `
                <tr>
                    <td>${op.rank}</td>
                    <td>${op.name}</td>
                    <td>${op.reputation}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        listContainer.innerHTML = `
            <style>
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 1rem;
                }
                th, td {
                    border: 1px solid #ccc;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
            </style>
            ${tableHTML}
        `;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupFuelPrices();
    setupFuelOperators();
});
document.querySelectorAll('td').forEach(cell => {
    const text = cell.textContent.trim();
    if (/^-\d+(\.\d+)?%?$/.test(text)) {
        cell.classList.add('negative-change');
    }
});
