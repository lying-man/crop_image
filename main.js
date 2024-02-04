"use strict";

if (!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent))) {

    //functionality
    let currentImageSrc = null;
    let cropInstance = null;
    let isLastStage = false;

    let zoomValue = 0.7;
    let startCords = {};
    let translateCords = { x: 0, y: 0 };
    let lastSaveCords = { x: 0, y: 0 };

    let undoList = [];
    let redoList = [];

    let modeActionMousemove = "drag";
    let currentBrushSize = 6;
    let currentColor = "#000";
    let isAction = false;

    let acceptedTypes = ["image/png", "image/jpg", "image/jpeg", "image/svg"];

    let isShowedScreensaver = localStorage.getItem("isShowedScreensaver");

    //elements
    const $screensaver = document.querySelector(".screensaver");
    const $btnCloseScreensaver = document.querySelector(".screensaver-close");

    //show screensaver
    if (isShowedScreensaver) $screensaver.classList.remove("active");

    const $notice = document.querySelector(".notice");
    const $noticeContent = document.querySelector(".notice-content");
    const $overlay = document.querySelector(".overlay");
    const $btnAddImage = document.querySelector(".generate");
    const $fileInput = document.querySelector('input[type="file"]');

    const $cropModalChoice = document.querySelector(".crop-modal-choice");
    const $btnStartCrop = document.querySelector(".start-crop");
    const $btnCancelCrop = document.querySelector(".not-crop");

    const $cropModalContent = document.querySelector(".crop-modal-content");
    const $cropModalContentClose = document.querySelector(".crop-modal-content-close");
    const $cropModalContentImage = document.querySelector(".crop-modal-img-cvn");

    const $stepTwo = document.querySelector(".step-two");
    const $stepLine = document.querySelector(".step-line");

    const $resetHighlight = document.querySelector(".reset-highlight");
    const $btnNextStep = document.querySelector(".next-highlight-btn");
    const $btnCropDownload = document.querySelector(".download-crop-btn");
    const footerListActions = [$resetHighlight, $btnNextStep, $btnCropDownload];

    const $cropModalToolbar = document.querySelector(".crop-modal-content-toolbar");
    const $cropModalTitle = document.querySelector(".crop-modal-status");

    const $drawCursor = document.querySelector(".custom-cursor");

    //toolbar
    const $btnUndo = document.querySelector(".undo");
    const $btnRedo = document.querySelector(".redo");
    const $colorBtnsParent = document.querySelector(".colors-btns");
    const $colorsBtns = document.querySelectorAll(".colors-btns-item");
    const $brushBtnsParent = document.querySelector(".brush-btns");
    const $brushBtns = document.querySelectorAll(".brush-btns-size");
    const $btnToggleModeMousemove = document.querySelector(".tool-btn");

    const $canvasBlock = document.querySelector(".canvas-block");
    const $canvas = document.querySelector(".canvas");
    const $canvasWrapper = document.querySelector(".canvas-wrapper");

    const ctx = $canvas.getContext("2d");

    function downloadImage() {
        const downloadLink = document.createElement("a");
        downloadLink.className = "download-link";
        downloadLink.setAttribute("href", currentImageSrc);
        downloadLink.setAttribute("download", "Ваше изображение");
        document.body.append(downloadLink);
        downloadLink.click();
        downloadLink.remove();

        showNotice({ mode: "success", text: "Скриншот загружается" });
    }

    function downloadHandler() {

        if (isLastStage) {
            currentImageSrc = $canvas.toDataURL("image/png");
        } else {
            currentImageSrc = cropInstance.getCroppedCanvas({}).toDataURL();
        }

        toggleCropModalContent("hide");

        setTimeout(() => downloadImage(), 600);

    }

    function startCrop() {
        $cropModalChoice.classList.remove("active"); 
        setTimeout(() => {

            $cropModalContentImage.src = currentImageSrc;

            if (!cropInstance) {
                cropInstance = new Cropper($cropModalContentImage, {
                    background: false,
                    zoomable: false,
                    viewMode: 2,
                });
            } else {
                cropInstance.replace(currentImageSrc);
            }

            toggleCropModalContent("show");
            toggleOverlayVisibility("show");

        }, 300);
    }

    function cancelCrop() {
        toggleCropModalChoice("hide");
        setTimeout(downloadImage, 300);
    }

    function cropModalContentClose() {
        toggleCropModalContent("hide");
    }

    function chooseColor(e) {
        let target = e.target;
        let colorsItemTarget = target.closest(".colors-btns-item");

        if (colorsItemTarget && target.matches(".colors-btns-item")) {
            for (let item of $colorsBtns) item.classList.remove("active");
            target.classList.add("active");
            currentColor = target.dataset.color;
        }

    }

    function chooseBrush(e) {
        let target = e.target;
        let brushItemTarget = target.closest(".brush-btns-size");

        if (brushItemTarget && target.matches(".brush-btns-size")) {
            for (let item of $brushBtns) item.classList.remove("active");
            target.classList.add("active");
            currentBrushSize = Number(target.dataset.size);
        }

    }

    function moveToPrevStage() {
        isLastStage = false;
        toggleCanvasBlock("hide");
        toggleSteps("down");
        toggleBtnActions("prev");
        toggleCropModalToolbar("hide");
        toggleCropModalTitle("hide");
        setNormalZoomCanvas();
        resetUserActions();
    }

    function moveToNexStage() {
        isLastStage = true;
        toggleCanvasBlock("show");
        toggleSteps("up");
        toggleBtnActions("next");
        toggleCropModalToolbar("show");
        toggleCropModalTitle("next");
        translateCords = { x: 0, y: 0 };
    }

    function moveToStage() {
        isLastStage ? moveToPrevStage() : moveToNexStage();
    }

    function toggleCanvasBlock(mode) {
        if (mode === "show") {

            let img = new Image();

            img.onload = () => {
                let width = img.width;
                let height = img.height;
                
                $canvas.width = width;
                $canvas.height = height;

                $canvasWrapper.style.width = img.width + "px";
                $canvasWrapper.style.height = img.height + "px";

                ctx.clearRect(0, 0, $canvas.width, $canvas.height);
                ctx.drawImage(img, 0, 0, width, height);

                if (width > 620 || height > 360) zoomValue = 0.3;

                $canvasWrapper.style.transform = `scale(${zoomValue})`;
                $canvasBlock.classList.add("active");

                //set drag action
                modeActionMousemove = "drag";
                $btnToggleModeMousemove.classList.add("active");
                $canvasBlock.classList.add("drag");
                $canvasBlock.classList.remove("draw");
            }
              
            img.src = cropInstance.getCroppedCanvas({}).toDataURL();
              
        } else {
            $canvasBlock.classList.remove("active");
        }
    }

    function resetToInitialState() {
        toggleCanvasBlock("show");
        translateCords = { x: 0, y: 0 };
        resetUserActions();
    }

    function toggleCropModalToolbar(mode) {
        mode === "show" ? $cropModalToolbar.classList.add("active") : $cropModalToolbar.classList.remove("active");
    }

    function toggleCropModalTitle(mode) {
        $cropModalTitle.classList.add("hide");
        setTimeout(() => {
            mode === "next" ? $cropModalTitle.textContent = "Разметка Изображения" : $cropModalTitle.textContent = "Обрезка Изображения";
            $cropModalTitle.classList.remove("hide");
        }, 300);
    }

    function toggleSteps(mode) {
        if (mode === "up") {
            $stepTwo.classList.add("active");
            $stepLine.classList.add("active");
        } else {
            $stepTwo.classList.remove("active");
            $stepLine.classList.remove("active");
        }
    }

    function toggleBtnActions(mode) {
        footerListActions.forEach(el => el.classList.add("hide"));

        setTimeout(() => {
            if (mode === "next") {
                $resetHighlight.classList.add("show");
                $btnCropDownload.textContent = "Скачать";
                $btnNextStep.textContent = "Назад";
            } else {
                $resetHighlight.classList.remove("show");
                $btnCropDownload.textContent = "Скачать Обрезанное Изображение";
                $btnNextStep.textContent = "Выделение На Скриншоте";
            }
            setTimeout(() => footerListActions.forEach(el => el.classList.remove("hide")), 50);
        }, 500);

    }

    function toggleCropModalContent(mode) {
        if (mode === "show") {
            $cropModalContent.classList.add("active");
            $cropModalContentClose.classList.add("active");
        } else {
            $cropModalContent.classList.remove("active");
            $cropModalContentClose.classList.remove("active");

            setTimeout(() => {
                moveToPrevStage();
                toggleOverlayVisibility("hide");
            }, 600);

        }
    }

    function toggleCropModalChoice(mode) {
        if (mode === "show") {
            $cropModalChoice.classList.add("active");
            toggleOverlayVisibility("show");
        } else { 
            $cropModalChoice.classList.remove("active"); 
            toggleOverlayVisibility("hide");
        }
    }

    //undo redo code
    function toggleBtnsManage(btn, mode) {
        if (mode === "active") {
            btn.classList.remove("disabled");
            btn.removeAttribute("disabled");
        } else {
            btn.classList.add("disabled");
            btn.setAttribute("disabled", "");
        }
    }

    function addActionToUndoList() {
        let currentAction = $canvas.toDataURL("image/png");
        undoList.unshift(currentAction);
        redoList = [];
        toggleBtnsManage($btnRedo, "disable");
        if (undoList.length > 1) toggleBtnsManage($btnUndo, "active");
    }

    function undoHandler() {

        toggleBtnsManage($btnRedo, "active");
        redoList.unshift(undoList.shift());
        displayImageOnCanvas(undoList[0]);
        if (undoList.length <= 1) toggleBtnsManage($btnUndo, "disable");

    }

    function redoHandler() {

        if (undoList.length >= 1) toggleBtnsManage($btnUndo, "active");
        let currentAction = redoList.shift();
        undoList.unshift(currentAction);
        displayImageOnCanvas(currentAction);
        if (!redoList.length) toggleBtnsManage($btnRedo, "disable");

    }

    function displayImageOnCanvas(src) {
        let img = new Image();

        img.onload = () => {
            ctx.clearRect(0, 0, $canvas.width, $canvas.height);
            ctx.drawImage(img, 0, 0, img.width, img.height);
        }
          
        img.src = src;
    }

    function resetUserActions() {
        undoList = [];
        redoList = [];
        toggleBtnsManage($btnRedo, "disable");
        toggleBtnsManage($btnUndo, "disable");
    }

    function toggleModeActionMousemove() {
        if (modeActionMousemove === "draw") {
            modeActionMousemove = "drag";
            $btnToggleModeMousemove.classList.add("active");
            $canvasBlock.classList.add("drag");
            $canvasBlock.classList.remove("draw");
        } else {
            $btnToggleModeMousemove.classList.remove("active");
            modeActionMousemove = "draw";
            $canvasBlock.classList.add("draw");
            $canvasBlock.classList.remove("drag");
        }
    }

    function showNotice(data) {
        $notice.classList.add(data.mode);
        $notice.classList.add("active");
        $noticeContent.textContent = data.text;
        setTimeout(() => {
            $notice.classList.remove(data.mode);
            $notice.classList.remove("active");
        }, 3000);
    }

    function toggleOverlayVisibility(mode) {
        if (mode === "show") {
            $overlay.classList.add("active");
        } else { $overlay.classList.remove("active"); }
    }

    async function handleScreenshootFn() {
        try {

            let items = await window.navigator.clipboard.read();
            let item = items[0];

            if (item.types[0].includes("image")) {
                let blob = await item.getType(item.types[0]);

                let reader = new FileReader();

                reader.onload = () => {
                    currentImageSrc = reader.result;
                    toggleCropModalChoice("show");
                }

                reader.readAsDataURL(blob);
            } else {
                showNotice({ mode: "failure", text: "Вы пытаетесь загрузить не скриншот" });
            }

        } catch(e) {
            showNotice({ mode: "failure", text: "Что то пошло не так, повторите снова" });
        }
    }

    function addImage() {
        $fileInput.click();
    }

    function getFile() {
        if (this.files) {

            let file = this.files[0];

            if (!acceptedTypes.includes(file.type)) {
                showNotice({ mode: "failure", text: "Добавленный тип данных не поддерживается" });
                return;
            }

            let reader = new FileReader();

            reader.readAsDataURL(file);

            reader.onload = () => {
                currentImageSrc = reader.result;
                startCrop();
            }

            reader.onerror = () => showNotice({ mode: "failure", text: "При загрузке картинки произошла ошибка, попробуйте снова" });

        }
    }
    
    function keyboardHandler(e) {
        let code = e.code;
        if (e.ctrlKey && code === "KeyB") handleScreenshootFn();
    }

    //drag and draw
    function mousedownDragHandler(e) {

        if (!isShowedScreensaver) return;
        if (!isLastStage) return;

        if (modeActionMousemove === "drag") {

            let target = e.target;

            if (target.closest(".canvas-wrapper")) {

                isAction = true;
                startCords = { x: e.clientX, y: e.clientY };
                $canvasWrapper.style.pointerEvents = "none";
                $canvasBlock.classList.add("dragging");

                $canvasBlock.addEventListener("mousemove", mousemoveDragHandler);
                $canvasBlock.addEventListener("mouseup", mouseupDragHandler);
    
            }

        }

    }

    function mousedownDrawHandler(e) {

        if (!isShowedScreensaver) return;
        if (!isLastStage) return;

        if (modeActionMousemove === "draw") {

            let x = e.offsetX;
            let y = e.offsetY;

            isAction = true;

            ctx.beginPath();
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentBrushSize;
            ctx.lineCap = "round";
            ctx.moveTo(x, y);

            $canvas.addEventListener("mousemove", mousemoveDrawHandler);
            $canvas.addEventListener("mouseup", mouseupDrawHandler);

        }

    }

    function mousemoveDragHandler(e) {
        lastSaveCords = { x: e.clientX, y: e.clientY };
        let cordX = translateCords.x + (e.clientX - startCords.x);
        let cordY = translateCords.y + (e.clientY - startCords.y);
        $canvasWrapper.style.transform = `translate(${cordX}px, ${cordY}px) scale(${zoomValue})`;
    }

    function mousemoveDrawHandler(e) {

        let x = e.offsetX;
        let y = e.offsetY;

        ctx.lineTo(x, y);
        ctx.stroke();

    }

    function mouseupDragHandler(e) {

        $canvasWrapper.style.pointerEvents = "";
        $canvasBlock.classList.remove("dragging");

        isAction = false;
        let x = translateCords.x + (e.clientX - startCords.x);
        let y = translateCords.y + (e.clientY - startCords.y);
        translateCords = { x, y };
        
        $canvasBlock.removeEventListener("mousemove", mousemoveDragHandler);
        $canvasBlock.removeEventListener("mouseup", mouseupDragHandler);

    }

    function mouseupDrawHandler() {
        isAction = false;
        ctx.closePath();
        addActionToUndoList();
        $canvas.removeEventListener("mousemove", mousemoveDrawHandler);
        $canvas.removeEventListener("mouseup", mouseupDrawHandler);
    }

    function mouseupGlobalHandler(e) {

        if (!isAction) return;

        if (!(e.target.closest(".canvas-block"))) {

            isAction = false;

            if (modeActionMousemove === "drag") {

                $canvasWrapper.style.pointerEvents = "";
                $canvasBlock.classList.remove("dragging");

                let x = translateCords.x + (lastSaveCords.x - startCords.x);
                let y = translateCords.y + (lastSaveCords.y - startCords.y);
                translateCords = { x, y };
                
                $canvasBlock.removeEventListener("mousemove", mousemoveDragHandler);
                $canvasBlock.removeEventListener("mouseup", mouseupDragHandler);

            } else {

                ctx.closePath();
                addActionToUndoList();
                $canvas.removeEventListener("mousemove", mousemoveDrawHandler);
                $canvas.removeEventListener("mouseup", mouseupDrawHandler);

            }
        }
    }

    function zoomHandler(e) {

        if (!isShowedScreensaver) return;
        if (!isLastStage) return;

        let offset = e.deltaY || e.detail || e.wheelDelta;

        if (offset > 0) {
            zoomValue -= 0.03;
        } else { zoomValue += 0.03; }

        if (zoomValue < 0.1) zoomValue = 0.1;

        $canvasWrapper.style.transform = `translate(${translateCords.x}px, ${translateCords.y}px) scale(${zoomValue})`;

    }

    function setNormalZoomCanvas() {
        zoomValue = 0.7;
    }

    function setShowedScreensaver() {
        localStorage.setItem("isShowedScreensaver", "true");
        $screensaver.classList.remove("active");
        isShowedScreensaver = "true";
    }

    function customCursorMove(e) {

        if (modeActionMousemove !== "draw") return;

        if (e.target.closest(".canvas-wrapper")) {

            if (!($drawCursor.classList.contains("active"))) $drawCursor.classList.add("active");

            $drawCursor.style.left = e.clientX + "px";
            $drawCursor.style.top = e.clientY - 20 + "px";

        } else {
            if ($drawCursor.classList.contains("active")) $drawCursor.classList.remove("active");
        }

    }

    //listeners
    document.documentElement.addEventListener("keydown", keyboardHandler);
    document.documentElement.addEventListener("wheel", zoomHandler);
    document.documentElement.addEventListener("mouseup", mouseupGlobalHandler);
    document.documentElement.addEventListener("mousemove", customCursorMove);

    $btnAddImage.addEventListener("click", addImage);
    $fileInput.addEventListener("change", getFile);

    $btnStartCrop.addEventListener("click", startCrop);
    $btnCancelCrop.addEventListener("click", cancelCrop);

    $cropModalContentClose.addEventListener("click", cropModalContentClose);

    $btnNextStep.addEventListener("click", moveToStage);
    $btnCropDownload.addEventListener("click", downloadHandler);


    $btnCloseScreensaver.addEventListener("click", setShowedScreensaver);

    $canvasBlock.addEventListener("mousedown", mousedownDragHandler);
    $canvasBlock.addEventListener("mousedown", mousedownDrawHandler);

    $btnToggleModeMousemove.addEventListener("click", toggleModeActionMousemove);

    $brushBtnsParent.addEventListener("click", chooseBrush);
    $colorBtnsParent.addEventListener("click", chooseColor);

    $btnUndo.addEventListener("click", undoHandler);
    $btnRedo.addEventListener("click", redoHandler);

    //clear all canvas
    $resetHighlight.addEventListener("click", resetToInitialState);
    
} else {
    //if user use phone devices
    const $wrapper = document.querySelector(".wrapper");
    $wrapper.innerHTML = "";
    $wrapper.insertAdjacentHTML("afterbegin", '<div class="mobile-text">*Полная функциональность сайта доступна только для компьютерных девайсов</div>');
}

