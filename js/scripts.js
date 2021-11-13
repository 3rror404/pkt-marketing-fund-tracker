(function (UTILS) {
    const COIN_DIVISION = 1073741824;

    UTILS.truncateString = function(value, options) {
        let startChars = (options && options.startChars && options.startChars > 0 ? options.startChars : 6);
        let endChars = (options && options.endChars && options.endChars > 0 ? options.endChars : 6);
        let seperator = (options && options.seperator ? options.seperator : '...');

        return `${value.substring(0, startChars)}${seperator}${value.substring(value.length - endChars)}`;
    }

    UTILS.convertToPKT = function(value, format) {
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
        txDate = moment(txDate);

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
* Application Start.
*/

const TARGET_VALUE = 25000000;
const ADDRESSES = ['pkt1q4fru3euy4g4w53rct6lwpehplrt0lpy2f5l0zc','pkt1q9cyzc7qy8z98sx6a7qqysztsp4h5js8295ln70']; // Newest => oldest
const REFRESH_MS = 60000; // How often the transaction data should be reloaded (ms)
let timer;

document.querySelector('.target').innerHTML = `${UTILS.numberWithCommas(TARGET_VALUE)} PKT`;
document.querySelector('.contribute-address').innerHTML = `${ADDRESSES[0]}`;

function loadData() {
  /**
   * Must initilise array with defined length so that we can insert txns[]
   * at correct index, maintaining the chronological order.
   */
  const transactions = new Array(ADDRESSES.length);
  let reqCount = ADDRESSES.length;

  for (let i = 0; i < ADDRESSES.length; i++) {
    loadWalletTransactions(ADDRESSES[i]).then((data) => {
      transactions[i] = data.results;
      reqCount--;
  
      if (reqCount === 0) { 
        done();
      }
    });
  }

  function done() {
    /**
     * All requests are complete.
     * It should be safe to flatten the array and continue.
     */
    buildUI(transactions.flat());
    document.querySelector('.loadable-content').classList.remove('loading');

    if (timer) { clearTimeout(timer) }
    timer = setTimeout(() => {
      loadData();
    }, REFRESH_MS);
  }
}

loadData();

function loadWalletTransactions(addressToLoad) {         
  return fetch(`https://explorer.pkt.cash/api/v1/PKT/pkt/address/${addressToLoad}/coins/?mining=excluded`)
  .then(response => response.json())
  .then(result => {
    return result;
  })
  .catch(error => console.log('error', error));
}

function buildUI(txns) {
  // We are only interested in deposits after+including block 1170657. Filter out all withdrawls & folding.
  txns = txns.filter(t => t.blockHeight >= 1170657 && t.input.every(i => !ADDRESSES.includes(i.address)));

  let cumulativeTotal = 0;
  
  const output = [`
    <div class="header-bar">
      <div class="address">Contributor</div>
      <div>PKT</div>
    </div>
  `];
  
  txns.forEach(tx => {
    // Make sure we don't include change in the tx value
    const outp = tx.output.find(o => ADDRESSES.includes(o.address));

    cumulativeTotal += parseInt(outp.value);
    
    output.push(`
      <div>
        <div class="address">${UTILS.truncateString(tx.input[0].address, {startChars: 10, endChars: 10})}</div>
        <div class="value">${UTILS.convertToPKT(outp.value, true)}</div>
      </div>
    `);
    
  });

  setGaugeValues(cumulativeTotal);
  document.querySelector('.contributors').innerHTML = output.join('');
}

function setGaugeValues(cumulativeTotal) {
  const pktBalance = UTILS.convertToPKT(cumulativeTotal);
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
  copyToClipboard(ADDRESSES[0]);

  clipboardControl.classList.add('copied');

  setTimeout(() => {
    clipboardControl.classList.remove('copied');
  }, 1500);
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