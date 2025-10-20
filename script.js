var canvas;
var stage;
var container;
var captureContainers = [];
var captureIndex = 0;
var textObj;
var startTime = Date.now();
var duration = 40000; // giữ như bạn đang dùng

// Read 'msg' from URL and default message
function getMessageFromURL() {
    var params = new URLSearchParams(window.location.search);
    var msg = params.get('msg');
    if (msg) return decodeURIComponent(msg);
    return "Gái cả của mẹ yêu mẹ rất nhiều \nI love you moaa moaa 😘😘";
}

function setMessage(newMsg) {
    if (!textObj) return;
    textObj.text = newMsg;
    stage.update();
}

function makeShareLink(msg) {
    var base = window.location.origin + window.location.pathname;
    var url = base + '?msg=' + encodeURIComponent(msg);
    return url;
}

// --- NEW: tạo/recache các buffer theo kích thước canvas hiện tại ---
function ensureCaptureCaches() {
    if (!captureContainers || captureContainers.length === 0) {
        captureContainers = [];
        for (var i = 0; i < 100; i++) {
            var cc = new createjs.Container();
            cc.cache(0, 0, canvas.width, canvas.height);
            captureContainers.push(cc);
        }
        captureIndex = 0;
        return;
    }
    // Đã có -> recache lại cho đúng canvas.width/height
    for (var j = 0; j < captureContainers.length; j++) {
        var c = captureContainers[j];
        if (c.uncache) c.uncache();
        c.cache(0, 0, canvas.width, canvas.height);
    }
}

// --- NEW: font size responsive theo chiều rộng canvas ---
function applyResponsiveFont() {
    var fontSize = Math.min(canvas.width * 0.07, 48); // 7% width, tối đa 48px
    textObj.font = "bold " + fontSize + "px 'Dancing Script', cursive";
}

function resizeCanvas() {
    // Bám theo kích thước hiển thị thực tế của canvas (do CSS quyết định)
    var cw = canvas.clientWidth;
    var ch = canvas.clientHeight;
    canvas.width = cw;
    canvas.height = ch;

    // recache tất cả buffer theo kích thước mới
    ensureCaptureCaches();

    // cập nhật vị trí & font chữ
    if (textObj) {
        applyResponsiveFont();
        textObj.x = canvas.width / 2;
        textObj.y = canvas.height / 2 - 20;
    }
    stage.update();
}

function init() {
    canvas = document.getElementById("testCanvas");
    stage = new createjs.Stage(canvas);

    // Kích thước ban đầu
    resizeCanvas();

    container = new createjs.Container();
    stage.addChild(container);

    // create many hearts
    for (var i = 0; i < 100; i++) {
        var heart = new createjs.Shape();
        heart.graphics.beginFill(createjs.Graphics.getHSL(Math.random() * 30 - 45, 100, 50 + Math.random() * 30));
        heart.graphics.moveTo(0, -12).curveTo(1, -20, 8, -20).curveTo(16, -20, 16, -10).curveTo(16, 0, 0, 12);
        heart.graphics.curveTo(-16, 0, -16, -10).curveTo(-16, -20, -8, -20).curveTo(-1, -20, 0, -12);
        heart.y = -100;
        container.addChild(heart);
    }

    // Text (giữ font family, hiệu ứng màu)
    textObj = new createjs.Text(getMessageFromURL(), "bold 48px 'Dancing Script', cursive", "#ffffff");
    textObj.textAlign = "center";
    textObj.lineHeight = 40;
    textObj.x = canvas.width / 2;
    textObj.y = canvas.height / 2 - 20;
    stage.addChild(textObj);

    // Khởi tạo caches theo kích thước hiện tại
    ensureCaptureCaches();

    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.on("tick", tick);

    // Basic UI wiring
    var msgInput = document.getElementById('messageInput');
    if (msgInput) {
        msgInput.value = textObj.text;
        document.getElementById('previewBtn').addEventListener('click', function() {
            setMessage(msgInput.value);
        });
        document.getElementById('makeLinkBtn').addEventListener('click', function() {
            var link = makeShareLink(msgInput.value);
            document.getElementById('shareLink').value = link;
        });
        document.getElementById('copyBtn').addEventListener('click', function() {
            var input = document.getElementById('shareLink');
            input.select();
            input.setSelectionRange(0, 99999);
            document.execCommand('copy');
        });
    }

    // Resize/orientation change
    window.addEventListener('resize', function () {
        resizeCanvas();
    });

    // Ẩn panel nếu truy cập bằng link chia sẻ
    if (new URLSearchParams(window.location.search).has('msg')) {
        var panel = document.getElementById('controlPanel');
        if (panel) panel.style.display = 'none';
    }

    // Áp font responsive lần đầu
    applyResponsiveFont();
    stage.update();
}

function tick(event) {
    var w = canvas.width;
    var h = canvas.height;
    var l = container.numChildren;

    captureIndex = (captureIndex + 1) % captureContainers.length;

    // ----- Chuyển màu từ trắng sang đen theo thời gian (giữ nguyên logic) -----
    var elapsed = Date.now() - startTime;
    var ratio = Math.min(elapsed / duration, 1);
    var value = Math.round(255 * (1 - ratio)); // 255 -> 0
    var newColor = "rgb(" + value + "," + value + "," + value + ")";
    textObj.color = newColor;
    // -------------------------------------------------------------------------

    // hoán đổi buffer nền
    if (stage.numChildren > 0) {
        stage.removeChildAt(0);
    }
    var captureContainer = captureContainers[captureIndex];
    stage.addChildAt(captureContainer, 0);
    captureContainer.addChild(container);

    // cập nhật tim
    for (var i = 0; i < l; i++) {
        var heart = container.getChildAt(i);
        if (heart.y < -50) {
            heart._x = Math.random() * w;
            heart.y = h * (1 + Math.random()) + 50;
            heart.perX = (1 + Math.random() * 2) * h;
            heart.offX = Math.random() * h;
            heart.ampX = heart.perX * 0.1 * (0.15 + Math.random());
            heart.velY = -Math.random() * 2 - 1;
            heart.scale = Math.random() * 2 + 1;
            heart._rotation = Math.random() * 40 - 20;
            heart.alpha = Math.random() * 0.75 + 0.05;
            heart.compositeOperation = Math.random() < 0.33 ? "lighter" : "source-over";
        }
        var intv = (heart.offX + heart.y) / heart.perX * Math.PI * 2;
        heart.y += heart.velY * heart.scaleX / 2;
        heart.x = heart._x + Math.cos(intv) * heart.ampX;
        heart.rotation = heart._rotation + Math.sin(intv) * 30;
    }

    // cập nhật cache với kích thước mới
    captureContainer.updateCache("source-over");
    stage.update(event);
}

init();

