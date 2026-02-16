const App = {
    surahs: ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"],
    history: ['p-home'],
    qMode: 'text',
    allReciters: [],
    dhikrData: [],
    prayerTimes: null,
    audio: document.getElementById('audio-player'),
    adan: document.getElementById('adan-player'),

    async init() {
        // تهيئة السجل للرجوع
        window.history.replaceState({page: 'p-home'}, '', '');
        
        this.updateTime();
        await this.loadReciters();
        await this.loadRadios();
        await this.loadDhikr();
        await this.loadTikTokVideos();
        this.getPrayerTimes();
        this.renderSurahList();
        this.setHomeImage();

        // مستمع لزر الرجوع الفعلي للهاتف
        window.onpopstate = (e) => {
            if (document.getElementById('audio-player-modal').classList.contains('active')) {
                this.closeAudioPlayer();
                return;
            }
            if (document.getElementById('modal').style.display === 'flex') {
                this.closeTafsir();
                return;
            }
            if (e.state && e.state.page) {
                this.renderPage(e.state.page, false);
            }
        };

        this.audio.ontimeupdate = () => this.updateAudioUI();
        document.getElementById('audio-progress').oninput = (e) => {
            if(this.audio.duration) this.audio.currentTime = (e.target.value * this.audio.duration) / 100;
        };
    },

    // --- نظام الوقت والأذان ---
    updateTime() {
        setInterval(() => {
            const now = new Date();
            document.getElementById('local-time').innerText = now.toLocaleTimeString('ar-EG', {hour12: false});
            if(this.prayerTimes) this.calculateNextPrayer(now);
        }, 1000);
    },

    getPrayerTimes() {
        navigator.geolocation.getCurrentPosition(async pos => {
            try {
                const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&method=4`);
                const data = await res.json();
                this.prayerTimes = data.data.timings;
                this.renderPrayerBar();
            } catch (e) { console.log("Prayer Fetch Error"); }
        });
    },

    renderPrayerBar() {
        ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach(p => {
            const el = document.getElementById(`pt-${p}`);
            if(el) el.querySelector('.time').innerText = this.prayerTimes[p];
        });
    },

    calculateNextPrayer(now) {
        const pNames = { "Fajr": "الفجر", "Dhuhr": "الظهر", "Asr": "العصر", "Maghrib": "المغرب", "Isha": "العشاء" };
        let next = null; let minDiff = Infinity;
        for (let k in pNames) {
            const [h, m] = this.prayerTimes[k].split(':');
            const pDate = new Date(); pDate.setHours(h, m, 0);
            let diff = pDate - now;
            if (diff > 0 && diff < minDiff) { minDiff = diff; next = { name: pNames[k], time: pDate }; }
        }
        const timer = document.getElementById('next-prayer-timer');
        if (next) {
            const hrs = Math.floor(minDiff / 3600000), mins = Math.floor((minDiff % 3600000) / 60000), secs = Math.floor((minDiff % 60000) / 1000);
            timer.innerText = `موعد أذان ${next.name} خلال ${hrs}:${mins}:${secs}`;
            if(hrs === 0 && mins === 0 && secs === 0) { this.adan.play(); alert(`حان الآن موعد أذان ${next.name}`); }
        } else { timer.innerText = "في انتظار صلاة الفجر"; }
    },

    // --- المصحف والتفسير ---
    switchQuran(mode) {
        this.qMode = mode;
        document.getElementById('q-txt-btn').classList.toggle('active', mode === 'text');
        document.getElementById('q-img-btn').classList.toggle('active', mode === 'image');
        this.renderSurahList();
    },

    renderSurahList() {
        document.getElementById('surah-grid').innerHTML = this.surahs.map((s, i) => `<div class="card" onclick="App.openSurah(${i+1}, '${s}')"><b>${s}</b></div>`).join('');
    },

    async openSurah(id, name) {
        this.nav('p-viewer');
        const v = document.getElementById('viewer-render');
        v.innerHTML = "<p style='text-align:center;'>جاري تحميل السورة...</p>";
        if (this.qMode === 'text') {
            const res = await fetch(`https://api.alquran.cloud/v1/surah/${id}`);
            const d = await res.json();
            v.innerHTML = `<div class="quran-view">` + d.data.ayahs.map(a => `<span class="ayah" onclick="App.showTafsir(${id}, ${a.numberInSurah}, \`${a.text}\`)">${a.text} ﴿${a.numberInSurah}﴾</span>`).join(' ') + `</div>`;
        } else { this.showQuranPage(1); }
    },

    showQuranPage(p) {
        if (p < 1 || p > 604) return;
        document.getElementById('viewer-render').innerHTML = `<img src="https://quran.yousefheiba.com/api/quran-pages/${p.toString().padStart(3, '0')}.png" style="width:100%; border-radius:10px;"><div style="text-align:center; padding:20px;"><button class="tab-btn" onclick="App.showQuranPage(${p+1})">التالي</button> <button class="tab-btn" onclick="App.showQuranPage(${p-1})">السابق</button></div>`;
    },

    async showTafsir(s, a, txt) {
        document.getElementById('m-title').innerText = txt;
        document.getElementById('m-body').innerHTML = "جاري تحميل التفسير الميسر...";
        document.getElementById('modal').style.display = 'flex';
        window.history.pushState({modal: 'open'}, '', ''); // للتفاعل مع زر الرجوع
        try {
            const res = await fetch(`https://api.quran.com/api/v4/tafsirs/14/by_ayah/${s}:${a}`);
            const d = await res.json();
            document.getElementById('m-body').innerHTML = d.tafsir.text;
        } catch(e) { document.getElementById('m-body').innerText = "خطأ في الاتصال بالسيرفر"; }
    },

    closeTafsir() { document.getElementById('modal').style.display = 'none'; },

    // --- الأذكار ---
    async loadDhikr() {
        const res = await fetch('dhikr.json');
        this.dhikrData = await res.json();
        this.renderDhikrCategories();
    },

    renderDhikrCategories() {
        document.getElementById('azkar-categories').style.display = 'grid';
        document.getElementById('azkar-content').innerHTML = '';
        document.getElementById('azkar-categories').innerHTML = this.dhikrData.map((c, i) => `<div class="card" onclick="App.showDhikrDetails(${i})"><b>${c.category}</b></div>`).join('');
    },

    showDhikrDetails(idx) {
        document.getElementById('azkar-categories').style.display = 'none';
        const cat = this.dhikrData[idx];
        let html = `<button class="tab-btn" style="width:100%; margin-bottom:20px;" onclick="App.renderDhikrCategories()">العودة للأقسام</button>`;
        html += cat.array.map(z => `<div class="dhikr-card" onclick="let n=this.querySelector('.num'); if(n.innerText>0) n.innerText--"><p>${z.text}</p><div class="dhikr-count">المتبقي: <span class="num">${z.count}</span></div></div>`).join('');
        document.getElementById('azkar-content').innerHTML = html;
        window.scrollTo(0,0);
    },

    // --- المرئيات والقراء ---
    async loadTikTokVideos() {
        try {
            const [r1, r2] = await Promise.all([fetch('videos.json'), fetch('tadabor.json')]);
            const d1 = await r1.json(), d2 = await r2.json();
            let all = [];
            d1.videos.forEach(r => r.videos.forEach(v => all.push({...v, sheikh: r.reciter_name})));
            Object.values(d2.tadabor).flat().forEach(v => all.push({...v, sheikh: "تدبر وآية"}));
            all = all.sort(() => Math.random() - 0.5);
            document.getElementById('tiktok-container').innerHTML = all.map(v => `
                <div class="video-snap">
                    <video loop playsinline preload="none" onclick="this.paused ? this.play() : this.pause()"><source src="${v.video_url}"></video>
                    <div class="video-overlay"><h3>${v.title || 'تلاوة مباركة'}</h3><p>${v.sheikh}</p></div>
                </div>`).join('');
            const obs = new IntersectionObserver(es => es.forEach(e => {
                const v = e.target.querySelector('video');
                if (e.isIntersecting) { v.play(); this.audio.pause(); } else { v.pause(); }
            }), { threshold: 0.6 });
            document.querySelectorAll('.video-snap').forEach(d => obs.observe(d));
        } catch(e) {}
    },

    async loadReciters() {
        const res = await fetch('reciters.json');
        const data = await res.json();
        this.allReciters = data.reciters;
        document.getElementById('reciters-grid').innerHTML = this.allReciters.map(r => `
            <div class="card" onclick="App.openSheikh('${r.server}', '${r.name}')">
                <img src="${r.img}" class="reciter-img" onerror="this.src='https://ui-avatars.com/api/?name=${r.name}&background=059669&color=fff'">
                <br><span>${r.name}</span>
            </div>`).join('');
    },

    openSheikh(srv, name) {
        const r = this.allReciters.find(x => x.name === name);
        this.nav('p-viewer');
        let html = `<h2 style="text-align:center; color:var(--accent); font-family:'Amiri';">${name}</h2><div class="grid">`;
        this.surahs.forEach((s, i) => {
            const num = (i + 1).toString().padStart(3, '0');
            html += `<div class="card" onclick="App.playAudio('${srv}${num}.mp3', '${s}', '${name}', '${r.img}')"><b>${s}</b></div>`;
        });
        document.getElementById('viewer-render').innerHTML = html + "</div>";
    },

    async loadRadios() {
        const res = await fetch('radio.json'); const data = await res.json();
        document.getElementById('radio-grid').innerHTML = data.radios.map(r => `<div class="card" onclick="App.playAudio('${r.url}', '${r.name}', 'بث مباشر', '')"><i class="fas fa-radio" style="font-size:1.5rem; color:var(--accent);"></i><br><span>${r.name}</span></div>`).join('');
    },

    // --- المشغل الصوتي ---
    playAudio(url, surah, sheikh, img) {
        const radioImg = "https://i.pinimg.com/564x/90/0d/b5/900db5bfa6f990f11da9f3ee8074f385.jpg";
        const finalImg = (img && img !== '') ? img : radioImg;

        this.audio.src = url; this.audio.play();
        document.getElementById('player-img').src = finalImg;
        document.getElementById('player-bg').style.backgroundImage = `url(${finalImg})`;
        document.getElementById('player-surah').innerText = surah;
        document.getElementById('player-sheikh').innerText = sheikh;
        document.getElementById('audio-player-modal').classList.add('active');
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
        
        window.history.pushState({player: 'open'}, '', ''); // للتفاعل مع زر الرجوع
    },

    toggleAudio() {
        if(this.audio.paused) { this.audio.play(); document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>'; }
        else { this.audio.pause(); document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>'; }
    },

    updateAudioUI() {
        if(!this.audio.duration) return;
        const p = (this.audio.currentTime / this.audio.duration) * 100;
        document.getElementById('audio-progress').value = p;
        document.getElementById('current-time').innerText = this.formatTime(this.audio.currentTime);
        document.getElementById('duration-time').innerText = this.formatTime(this.audio.duration);
    },

    formatTime(sec) { let m=Math.floor(sec/60), s=Math.floor(sec%60); return `${m}:${s<10?'0'+s:s}`; },
    closeAudioPlayer() { document.getElementById('audio-player-modal').classList.remove('active'); },

    async setHomeImage() {
        try {
            const res = await fetch('tadabor.json'); const data = await res.json();
            const all = Object.values(data.tadabor).flat();
            document.getElementById('home-random-img').src = all[Math.floor(Math.random() * all.length)].image_url;
        } catch(e) {}
    },

    // --- الملاحة ---
    nav(id, btn) {
        if (this.history[this.history.length - 1] !== id) { 
            this.history.push(id); 
            window.history.pushState({page: id}, '', ''); 
        }
        this.renderPage(id);
        if (btn) { document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active')); btn.classList.add('active'); }
    },

    renderPage(id, push = true) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
        document.getElementById(id).classList.add('active-page');
        document.getElementById('back-nav').style.display = id === 'p-home' ? 'none' : 'block';
    },

    goBack() { window.history.back(); },
    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        document.getElementById('theme-icon').className = isDark ? 'fas fa-moon' : 'fas fa-sun';
    }
};

window.onload = () => App.init();
