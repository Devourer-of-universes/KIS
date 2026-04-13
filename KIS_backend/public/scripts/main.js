const leftMenu = document.querySelector('.left-menu');
const toggleBtn = document.querySelector('.toggle-btn');

toggleBtn.addEventListener('click', function(e){
    e.stopPropagation();
    leftMenu.classList.toggle('pinned');

    const isPinned = leftMenu.classList.contains('pinned');
    localStorage.setItem('leftMenuPinned', isPinned);

    updateContentMargin();
})

function updateContentMargin(){
    const isPinned = leftMenu.classList.contains('pinned');
    const menuWidth = isPinned ? 250 : 60;
    document.querySelectorAll('.chat-container, .main-content, .page-container').forEach(container => {
        container.style.marginLeft = menuWidth + 'px';
        container.style.transition = 'margin-left 0.3s ease';
    })
}


document.addEventListener('DOMContentLoaded', function() {
    const isPinned = localStorage.getItem('leftMenuPinned') === 'true';
    
    if (isPinned) {
        leftMenu.classList.add('pinned');
    }
    
    updateContentMargin();
});


document.addEventListener('click', function(e) {
    if (!leftMenu.contains(e.target) && !leftMenu.classList.contains('pinned')) {
        leftMenu.style.width = '60px';
    }
});
function updateColorScheme(color_scheme){
    const root = document.documentElement;    
    switch(color_scheme) {
        case 'light':
            root.style.setProperty('--c_bg', '#e8e8e8');
            root.style.setProperty('--c_bg_txt', '#000000');
            root.style.setProperty('--c_surf', '#ffffff');
            root.style.setProperty('--c_surf_txt', '#9b9b9b');
            break;
        case 'dark':
            root.style.setProperty('--c_bg', '#32343e');
            root.style.setProperty('--c_bg_txt', '#ffffff');
            root.style.setProperty('--c_surf', '#3d3f4a');
            root.style.setProperty('--c_surf_txt', '#9b9b9b');
            break;
        default:
            console.warn('Unknown color scheme:', color_scheme);
    }
}
function updateAccent(acc_color){
    const root = document.documentElement;
    root.style.setProperty('--c_acc', acc_color);
    const accentTransparent = hexToRgba(acc_color, 0.5);
    root.style.setProperty('--c_acchalf', accentTransparent);
}
function hexToRgba(hex, opacity) {
    hex = hex.replace('#', '');   
    let r, g, b;
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else {
        return hex;
    } 
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}