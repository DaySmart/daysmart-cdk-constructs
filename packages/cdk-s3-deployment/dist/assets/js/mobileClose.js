function sendCloseMessage() {
    try {
        Android.closeQuickbooksSignUp();
    } catch (e) {}

    try {
        window.webkit.messageHandlers.observe.postMessage('Close');
    } catch (e) {}
}

function log(message) {
    console.log(message);
}