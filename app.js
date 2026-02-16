const App = {
    audio: new Audio(),
    isPlaying: false,

    async init() {
        this.updateTime();
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
        setInterval(() => this.updateTime(), 60000);
    },

    // الملاحة السلسة
    nav(id, btn) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
        document.getElementById(id).classList.add('active-page');
        
        if (btn) {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            btn.classList.add('active');
        }

        // تحميل البيانات الذكي
        const loaders = {
            'p-quran': () => this.loadQuran(),
            'p-reciters': () => this.loadReciters(),
            'p-azkar': () => this.loadAzkar(),
            'p-radio': () => this.loadRadio(),
            'p-tadabor': () => this.loadTadabor(),
            'p-videos': () => this.loadVideos()
        };
        if (loaders[id]) loaders[id]();
    },

    async loadReciters() {
        const res = await fetch('reciters.json');
        const data = await res.json();
        const container = document.getElementById('reciters-list');
        container.innerHTML = data.reciters.map(r => `
            <div class="service-item" onclick="App.playAudio('${r.server}001.mp3', '${r.name}', '${r.img}')">
                <img src="${r.img}" style="width:70px; height:70px; border-radius:50%; margin-bottom:10px; object-fit:cover">
                <span style="display:block">${r.name}</span>
            </div>
        `).join('');
    },

    async loadRadio() {
        const res = await fetch('radio.json');
        const data = await res.json();
        const container = document.getElementById('p-radio');
        container.innerHTML = `<h2 style="padding:20px 0">إذاعات القرآن المباشرة</h2>` + data.radios.map(r => `
            <div class="list-card" onclick="App.playAudio('${r.url}', '${r.name}')">
                <div style="width:50px; height:50px; background:var(--p); color:white; border-radius:12px; display:flex; align-items:center; justify-content:center"><i class="fas fa-tower-broadcast"></i></div>
                <div style="flex:1"><strong>${r.name}</strong></div>
                <i class="fas fa-play-circle" style="color:var(--p); font-size:1.5rem"></i>
            </div>
        `).join('');
    },

    playAudio(url, title, img = null) {
        this.audio.src = url;
        this.audio.play();
        this.isPlaying = true;
        document.getElementById('floating-player').style.display = 'flex';
        document.getElementById('player-title').innerText = title;
        if (img) document.getElementById('player-img').innerHTML = `<img src="${img}" style="width:100%; height:100%; border-radius:10px">`;
        document.getElementById('play-icon').className = 'fas fa-pause';
    },

    toggleAudio() {
        if (this.isPlaying) {
            this.audio.pause();
            document.getElementById('play-icon').className = 'fas fa-play';
        } else {
            this.audio.play();
            document.getElementById('play-icon').className = 'fas fa-pause';
        }
        this.isPlaying = !this.isPlaying;
    },

    updateTime() {
        const now = new Date();
        document.getElementById('next-prayer-time').innerText = now.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'});
        document.getElementById('hijri-date').innerText = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {day:'numeric', month:'long', year:'numeric'}).format(now);
    },

    toggleTheme() {
        const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', theme);
    }
};

window.onload = () => App.init();
