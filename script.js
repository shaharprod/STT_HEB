class SpeechToText {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.continuousMode = false;

        this.initializeElements();
        this.setupEventListeners();
        this.initializeSpeechRecognition();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.outputText = document.getElementById('outputText');
        this.statusText = document.getElementById('statusText');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.languageSelect = document.getElementById('languageSelect');
        this.continuousModeCheckbox = document.getElementById('continuousMode');
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.clearBtn.addEventListener('click', () => this.clearText());
        this.languageSelect.addEventListener('change', () => this.updateLanguage());
        this.continuousModeCheckbox.addEventListener('change', (e) => {
            this.continuousMode = e.target.checked;
        });
    }

    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.updateStatus('הדפדפן שלך לא תומך בהכרת דיבור', 'error');
            this.startBtn.disabled = true;
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'he-IL';

        this.recognition.onstart = () => {
            this.isRecording = true;
            this.updateUI();
            this.updateStatus('מקליט...', 'recording');
            this.showRecordingIndicator();
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                this.appendToOutput(finalTranscript);
            }

            if (interimTranscript) {
                this.updateStatus(`מזהה: ${interimTranscript}`, 'interim');
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.handleError(event.error);
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            this.updateUI();
            this.hideRecordingIndicator();

            if (this.continuousMode) {
                setTimeout(() => {
                    if (!this.isRecording) {
                        this.startRecording();
                    }
                }, 100);
            } else {
                this.updateStatus('ההקלטה הסתיימה', 'stopped');
            }
        };
    }

    startRecording() {
        if (!this.recognition) {
            this.updateStatus('הכרת הדיבור לא זמינה', 'error');
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            this.updateStatus('שגיאה בהתחלת ההקלטה', 'error');
        }
    }

    stopRecording() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }
    }

    clearText() {
        this.outputText.value = '';
        this.updateStatus('הטקסט נוקה', 'cleared');
    }

    appendToOutput(text) {
        const currentText = this.outputText.value;
        this.outputText.value = currentText + (currentText ? ' ' : '') + text;

        // גלילה אוטומטית לתחתית
        this.outputText.scrollTop = this.outputText.scrollHeight;
    }

    updateLanguage() {
        if (this.recognition) {
            this.recognition.lang = this.languageSelect.value;
        }
    }

    updateStatus(message, type = 'info') {
        this.statusText.textContent = message;
        this.statusText.className = `status-text ${type}`;
    }

    showRecordingIndicator() {
        this.recordingIndicator.classList.remove('hidden');
    }

    hideRecordingIndicator() {
        this.recordingIndicator.classList.add('hidden');
    }

    updateUI() {
        this.startBtn.disabled = this.isRecording;
        this.stopBtn.disabled = !this.isRecording;
    }

    handleError(error) {
        let errorMessage = 'שגיאה לא ידועה';

        switch (error) {
            case 'no-speech':
                errorMessage = 'לא זוהה דיבור';
                break;
            case 'audio-capture':
                errorMessage = 'בעיה בגישה למיקרופון';
                break;
            case 'not-allowed':
                errorMessage = 'אין הרשאה לגישה למיקרופון';
                break;
            case 'network':
                errorMessage = 'בעיית רשת';
                break;
            case 'service-not-allowed':
                errorMessage = 'השירות לא זמין';
                break;
            case 'bad-grammar':
                errorMessage = 'בעיה בדקדוק';
                break;
            case 'language-not-supported':
                errorMessage = 'השפה לא נתמכת';
                break;
        }

        this.updateStatus(`שגיאה: ${errorMessage}`, 'error');
    }
}

// אתחול האפליקציה כשהדף נטען
document.addEventListener('DOMContentLoaded', () => {
    new SpeechToText();
});

// הוספת פונקציונליות נוספת
document.addEventListener('keydown', (e) => {
    // מקש רווח להתחלת/עצירת הקלטה
    if (e.code === 'Space' && e.ctrlKey) {
        e.preventDefault();
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');

        if (!startBtn.disabled) {
            startBtn.click();
        } else if (!stopBtn.disabled) {
            stopBtn.click();
        }
    }

    // Ctrl+Delete לניקוי הטקסט
    if (e.code === 'Delete' && e.ctrlKey) {
        e.preventDefault();
        document.getElementById('clearBtn').click();
    }
});
