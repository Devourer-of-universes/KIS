document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.settings-section').forEach(section => section.classList.remove('active'));
        this.classList.add('active');
        const targetId = this.getAttribute('href').substring(1);
        document.getElementById(targetId).classList.add('active');
    });
});

document.querySelectorAll('.switch input').forEach(switchEl => {
    switchEl.addEventListener('change', function() {
        console.log('Настройка изменена:', this.checked);
    });
});
document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        const theme = this.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });
});

const scaleSlider = document.querySelector('.scale-slider');
const scaleValue = document.querySelector('.scale-value');

scaleSlider.addEventListener('input', function() {
    scaleValue.textContent = this.value + '%';
    document.documentElement.style.fontSize = this.value + '%';
});