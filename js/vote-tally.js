// Shared "vote tally" UI: the gold pill showing a venue's live vote count.
// Used on venue cards (browse/leaderboard), the map popup, and the vote modal
// so the markup + slot-machine increment animation only live in one place.

export function renderVoteTally(voteCount) {
    const count = Number(voteCount) || 0;
    const label = count === 1 ? 'vote' : 'votes';
    return `<div class="prominent-vote-tally" aria-label="${count} ${label}">
        <span class="tally-number">${count}</span>
        <span class="tally-label">${label}</span>
    </div>`;
}

// Builds one digit position of the odometer. Digits that don't change between
// `oldDigit` and `newDigit` render as plain text; digits that do change render
// as a two-lap reel (0-9 twice) so it can always spin forward to its target,
// wrapping around on rollovers (e.g. 9 -> 0 when carrying into the next digit).
function buildDigitReel(oldDigit, newDigit) {
    if (oldDigit === newDigit) {
        return `<span class="tally-digit tally-digit-static">${newDigit}</span>`;
    }
    const target = newDigit >= oldDigit ? newDigit : (10 + newDigit);
    let cells = '';
    for (let loop = 0; loop < 2; loop++) {
        for (let d = 0; d <= 9; d++) {
            cells += `<span class="tally-digit-cell">${d}</span>`;
        }
    }
    return `<span class="tally-digit-reel"><span class="tally-digit-track" data-target="${target}" style="transform: translateY(-${oldDigit}em)">${cells}</span></span>`;
}

// Animates a `.prominent-vote-tally` element's number from `fromCount` to
// `toCount` with a slot-machine / odometer roll, then a little landing "pop".
// Resolves once the animation has fully settled.
export function animateVoteTallySlotMachine(tallyEl, fromCount, toCount) {
    return new Promise((resolve) => {
        if (!tallyEl) { resolve(); return; }
        const numberEl = tallyEl.querySelector('.tally-number');
        const labelEl = tallyEl.querySelector('.tally-label');
        if (!numberEl) { resolve(); return; }

        const from = Number(fromCount) || 0;
        const to = Number.isFinite(Number(toCount)) ? Number(toCount) : from + 1;
        const fromStr = String(from);
        const toStr = String(to);
        const len = Math.max(fromStr.length, toStr.length);
        const fromPadded = fromStr.padStart(len, '0');
        const toPadded = toStr.padStart(len, '0');

        let reelsHtml = '';
        for (let i = 0; i < len; i++) {
            const isNewDigitSlot = i < (len - fromStr.length);
            const oldDigit = isNewDigitSlot ? 0 : parseInt(fromPadded[i], 10);
            const newDigit = parseInt(toPadded[i], 10);
            reelsHtml += buildDigitReel(oldDigit, newDigit);
        }

        numberEl.innerHTML = reelsHtml;
        numberEl.dataset.value = to;
        if (labelEl) labelEl.textContent = to === 1 ? 'vote' : 'votes';

        const tracks = numberEl.querySelectorAll('.tally-digit-track');
        if (!tracks.length) { resolve(); return; }

        tallyEl.classList.add('tally-spinning');

        // Force a layout flush so the browser registers the starting transform
        // before we change it, otherwise both changes get batched and it never spins.
        void numberEl.offsetHeight;

        tracks.forEach((track, i) => {
            const target = Number(track.dataset.target);
            const delay = (tracks.length - 1 - i) * 80;
            track.style.transitionDelay = `${delay}ms`;
            track.style.transform = `translateY(-${target}em)`;
        });

        const totalDelay = (tracks.length - 1) * 80;
        const settleTime = totalDelay + 650;
        setTimeout(() => {
            tallyEl.classList.remove('tally-spinning');
            tallyEl.classList.add('tally-landed');
            setTimeout(() => tallyEl.classList.remove('tally-landed'), 350);
            resolve();
        }, settleTime);
    });
}
