(function (UTILS) {
    const COIN_DIVISION = 1073741824;

    UTILS.truncateString = function(value, options) {
        let startChars = (options && options.startChars && options.startChars > 0 ? options.startChars : 6);
        let endChars = (options && options.endChars && options.endChars > 0 ? options.endChars : 6);
        let seperator = (options && options.seperator ? options.seperator : '...');

        return `${value.substring(0, startChars)}${seperator}${value.substring(value.length - endChars)}`;
    }

    UTILS.convertToPKT = function (value, format) {
        if (typeof value !== 'number') { value = parseFloat(value) };

        let result = Math.round((value / COIN_DIVISION) * 100) / 100;
        if (format) {
            return UTILS.numberWithCommas(result);
        }
        return result;
    }

    UTILS.numberWithCommas = function (value) {
        if (typeof value !== 'number') { value = parseFloat(value) };

        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    UTILS.getTimeOffsetString = function(txDate) {
        const now = moment().local();
        txDate = moment(txDate); //.add(1, 'hours');

        const diffDays = now.diff(txDate, 'days');
        const diffHours = now.diff(txDate, 'hours');
        const diffMinutes = now.diff(txDate, 'minutes');
        const diffSeconds = now.diff(txDate, 'seconds');

        const realHours = diffHours - (diffDays * 24);
        const realMinutes = diffMinutes - (diffHours * 60);
        const realSeconds = diffSeconds - (diffMinutes * 60);

        return `${diffDays > 0 ? diffDays + ' days ' : ''}${realHours > 0 ? realHours + ' hrs ' : ''}${diffDays < 1 && realMinutes > 0 ? realMinutes + ' mins ' : ''}${diffDays < 1 && realHours < 1 && realMinutes < 1 && realSeconds > 0 ? realSeconds + ' secs ' : ''} ago`;
    }
    
}(window.UTILS = window.UTILS || {}));

/**
* Application
*/

const TARGET_VALUE = 25000000;
const ADDRESS = 'pkt1q4fru3euy4g4w53rct6lwpehplrt0lpy2f5l0zc';
const REFRESH_MS = 60000;
let timer;

document.querySelector('.target').innerHTML = `${UTILS.numberWithCommas(TARGET_VALUE)} PKT`;
document.querySelector('.contribute-address').innerHTML = `${ADDRESS}`;

function loadData() {
  loadWalletData().then((data) => {
    setGaugeValues(data);
  });

  loadWalletTransactions().then((data) => {
    buildContributionsList(data.results);

    document.querySelector('.loadable-content').classList.remove('loading');

    if (timer) { clearTimeout(timer) }
    timer = setTimeout(() => {
      loadData();
    }, REFRESH_MS);
  });
}

loadData();

function loadWalletData() {         
  return fetch(`https://explorer.pkt.cash/api/v1/PKT/pkt/address/${ADDRESS}`)
  .then(response => response.json())
  .then(result => {
    return result;
  })
  .catch(error => console.log('error', error));
}

function loadWalletTransactions() {         
  return fetch(`https://explorer.pkt.cash/api/v1/PKT/pkt/address/${ADDRESS}/coins/?mining=excluded`)
  .then(response => response.json())
  .then(result => {
    return result;
  })
  .catch(error => console.log('error', error));
}

function setGaugeValues(data) {
  const pktBalance = UTILS.convertToPKT(data.balance);
  const percentage = Math.round((pktBalance / TARGET_VALUE) * 100);
  
  const gaugeEl = document.querySelector('.gauge');
  const gaugeIndicatorEl = gaugeEl.querySelector('.indicator');
  
  gaugeEl.addEventListener('transitionend', () => {
    gaugeIndicatorEl.classList.add('loaded');
  });
  
  gaugeIndicatorEl.dataset.value = `${percentage}%`;
  gaugeIndicatorEl.style.left = `${percentage}%`;
  gaugeEl.style.width = `${percentage}%`;
  gaugeEl.classList.add('animated');
  
}

function buildContributionsList(txns) {
  // We are only interested in deposits. Filter out all withdrawls.
  txns = txns.filter(d => d.input.every(c => c.address !== ADDRESS));
  
  const output = [`
    <div class="header-bar">
      <div class="address">Contributor</div>
      <div>PKT</div>
    </div>
  `];
  
  txns.forEach(tx => {
    // Make sure we don't include change in the tx value
    const outp = tx.output.find(o => o.address === ADDRESS);
    
    output.push(`
      <div>
        <div class="address">${UTILS.truncateString(tx.input[0].address, {startChars: 10, endChars: 10})}</div>
        <div class="value">${UTILS.convertToPKT(outp.value, true)}</div>
      </div>
    `);
    
  });

  document.querySelector('.contributors').innerHTML = output.join('');
}

const tabs = document.querySelectorAll('.tabs .tab');
const tabControls = document.querySelector('.tab-controls');

tabControls.addEventListener('click', function(event) {
  event.preventDefault();
  
  let target = event.target;

  if (target.tagName != 'A') { return }

  const targetSelector = target.dataset.target;

  tabControls.querySelectorAll('a').forEach((a) => {
    a.classList.remove('active');
  });
  event.target.classList.add('active');

  tabs.forEach((tab) => {
    tab.classList.remove('active');
  });

  document.querySelector(targetSelector).classList.add('active');
});

const clipboardControl = document.querySelector('.clipboard-control');
clipboardControl.addEventListener('click', () => {
  copyToClipboard(ADDRESS);

  clipboardControl.classList.add('copied');

  setTimeout(() => {
    clipboardControl.classList.remove('copied');
  }, 3000);
});

function copyToClipboard(text) {
  // create temp element
  var copyElement = document.createElement("span");
  copyElement.appendChild(document.createTextNode(text));
  copyElement.id = 'tempCopyToClipboard';
  document.body.append(copyElement)
  //angular.element(document.body.append(copyElement));

  // select the text
  var range = document.createRange();
  range.selectNode(copyElement);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  // copy & cleanup
  document.execCommand('copy');
  window.getSelection().removeAllRanges();
  copyElement.remove();
}