class SpeechToText {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.continuousMode = false;
        this.lastInterimText = ''; // שמירת טקסט interim לנייד
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.autoRestartTimeout = null; // timeout להתחלה מחדש בניידים

        this.initializeElements();
        this.setupEventListeners();
        this.initializeSpeechRecognition();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.removeDuplicatesBtn = document.getElementById('removeDuplicatesBtn');
        this.outputText = document.getElementById('outputText');
        this.statusText = document.getElementById('statusText');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.languageSelect = document.getElementById('languageSelect');
        this.continuousModeCheckbox = document.getElementById('continuousMode');
        this.downloadFormatSelect = document.getElementById('downloadFormat');

        // בדיקה שהכפתור נמצא
        if (this.removeDuplicatesBtn) {
            console.log('כפתור ניקוי כפילויות נמצא');
        } else {
            console.error('כפתור ניקוי כפילויות לא נמצא!');
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.clearBtn.addEventListener('click', () => this.clearText());
        this.downloadBtn.addEventListener('click', () => this.downloadText());

        // בדיקה וחיבור כפתור ניקוי כפילויות
        if (this.removeDuplicatesBtn) {
            this.removeDuplicatesBtn.addEventListener('click', () => this.removeDuplicatesFromExistingText());
            console.log('Event listener לכפתור ניקוי כפילויות מחובר');
        } else {
            console.error('לא ניתן לחבר event listener לכפתור ניקוי כפילויות');
        }

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

        // הגדרות אחידות לכל המכשירים
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

            // לוגיקה אחידה לכל המכשירים
            if (finalTranscript) {
                this.addCleanText(finalTranscript);
                this.lastInterimText = '';
            } else if (interimTranscript && interimTranscript.length > 1) {
                this.updateStatus(`מזהה: ${interimTranscript}`, 'interim');
                this.lastInterimText = interimTranscript;
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

            // לוגיקה אחידה לכל המכשירים
            if (this.lastInterimText && this.lastInterimText.length > 1) {
                this.addCleanText(this.lastInterimText);
                this.lastInterimText = '';
            }

            // בניידים - תמיד המשך הקלטה עם timeout קצר יותר
            if (this.isMobile) {
                this.autoRestartTimeout = setTimeout(() => {
                    if (!this.isRecording) {
                        console.log('מתחיל הקלטה מחדש בנייד...');
                        this.startRecording();
                    }
                }, 50); // timeout קצר מאוד לניידים
            } else if (this.continuousMode) {
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

        if (this.isMobile) {
            this.updateStatus('מכשיר נייד זוהה - הקלטה רציפה עם התחלה מחדש אוטומטית', 'info');
            console.log('מתחיל הקלטה בנייד עם התחלה מחדש אוטומטית...');
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            this.updateStatus('שגיאה בהתחלת ההקלטה - בדוק הרשאות מיקרופון', 'error');
        }
    }

    stopRecording() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }

        // נקה את ה-timeout האוטומטי בניידים
        if (this.autoRestartTimeout) {
            clearTimeout(this.autoRestartTimeout);
            this.autoRestartTimeout = null;
        }
    }

    clearText() {
        this.outputText.value = '';
        this.updateStatus('הטקסט נוקה', 'cleared');
        this.updateDownloadButton();
    }

    addCleanText(text) {
        // ניקוי הטקסט
        let cleanText = text.trim();

        if (!cleanText) return;

        // קבל את הטקסט הנוכחי
        const currentText = this.outputText.value;

        // בדיקה עדינה נגד כפילויות ברורות בלבד
        if (currentText && currentText.endsWith(cleanText)) {
            console.log('נמנעה כפילות ברורה:', cleanText);
            return; // אל תוסיף אם הטקסט זהה לטקסט האחרון
        }

        // הוספת הטקסט החדש
        const separator = currentText ? ' ' : '';
        this.outputText.value = currentText + separator + cleanText;

        // עדכון UI
        this.outputText.scrollTop = this.outputText.scrollHeight;
        this.updateDownloadButton();

        // הודעה לדיבוג
        console.log('נוסף טקסט:', cleanText);
    }

    removeDuplicatesFromExistingText() {
        console.log('כפתור ניקוי כפילויות נלחץ!');
        
        // ניקוי כפילויות מהטקסט הקיים - שמירת משפטים מושלמים קודמים
        const currentText = this.outputText.value.trim();
        console.log('טקסט נוכחי:', currentText);
        
        if (!currentText) {
            console.log('אין טקסט לניקוי');
            this.updateStatus('אין טקסט לניקוי', 'info');
            return;
        }

        const words = currentText.split(' ');
        console.log('מילים לפני ניקוי:', words);
        
        // מצא את התבנית המושלמת (המילים האחרונות ללא כפילויות)
        let perfectPattern = [];
        let foundPattern = false;
        
        // התחל מהסוף וחפש תבנית מושלמת
        for (let i = words.length - 1; i >= 0; i--) {
            const currentWord = words[i];
            
            // אם המילה לא קיימת בתבנית המושלמת, הוסף אותה
            if (!perfectPattern.includes(currentWord)) {
                perfectPattern.unshift(currentWord);
            } else {
                // אם המילה כבר קיימת, זה סוף התבנית המושלמת
                foundPattern = true;
                break;
            }
        }
        
        console.log('תבנית מושלמת שנמצאה:', perfectPattern);
        
        if (foundPattern && perfectPattern.length > 0) {
            // מצא את המיקום של התבנית המושלמת בטקסט
            const perfectPatternText = perfectPattern.join(' ');
            const lastIndex = currentText.lastIndexOf(perfectPatternText);
            
            if (lastIndex !== -1) {
                // קח את הטקסט עד לתבנית המושלמת (כולל משפטים קודמים)
                const textBeforePattern = currentText.substring(0, lastIndex).trim();
                const cleanedText = textBeforePattern ? textBeforePattern + ' ' + perfectPatternText : perfectPatternText;
                
                this.outputText.value = cleanedText;
                
                const removedCount = words.length - cleanedText.split(' ').length;
                this.updateStatus(`נוקו ${removedCount} מילים כפולות - נשמרו משפטים קודמים`, 'success');
                console.log('נוקו מילים כפולות:', removedCount);
                console.log('טקסט אחרי ניקוי:', cleanedText);
            } else {
                this.updateStatus('לא נמצאה תבנית מושלמת', 'info');
                console.log('לא נמצאה תבנית מושלמת');
            }
        } else {
            this.updateStatus('לא נמצאה תבנית מושלמת', 'info');
            console.log('לא נמצאה תבנית מושלמת');
        }
        
        this.updateDownloadButton();
    }

    downloadText() {
        const text = this.outputText.value.trim();

        if (!text) {
            this.updateStatus('אין טקסט להורדה', 'error');
            return;
        }

        try {
            const format = this.downloadFormatSelect.value;
            const timestamp = new Date().toLocaleString('he-IL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(/[\/\s:]/g, '-');

            let filename, content, mimeType;

        switch (format) {
            case 'txt':
                filename = `stt-hebrew-${timestamp}.txt`;
                content = text;
                mimeType = 'text/plain;charset=utf-8';
                break;
            case 'doc':
                filename = `stt-hebrew-${timestamp}.doc`;
                content = this.createWordDocument(text);
                mimeType = 'application/msword';
                break;
            case 'html':
                filename = `stt-hebrew-${timestamp}.html`;
                content = this.createHtmlDocument(text);
                mimeType = 'text/html;charset=utf-8';
                break;
            default:
                filename = `stt-hebrew-${timestamp}.txt`;
                content = text;
                mimeType = 'text/plain;charset=utf-8';
        }

            this.downloadFile(filename, content, mimeType);
            this.updateStatus(`קובץ ${format.toUpperCase()} הורד בהצלחה`, 'success');
        } catch (error) {
            console.error('Error downloading file:', error);
            this.updateStatus('שגיאה בהורדת הקובץ', 'error');
        }
    }

    createWordDocument(text) {
        // יצירת מסמך Word פשוט בפורמט RTF
        // תחילה נמלט את כל התווים המיוחדים של RTF
        let escapedText = text
            .replace(/\\/g, '\\\\')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/\n/g, '\\par\n');

        const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 ${escapedText}}`;
        return rtfContent;
    }

    createHtmlDocument(text) {
        // נמלט את הטקסט עבור HTML
        const escapedText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>טקסט מומר - STT עברית</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            text-align: right;
            margin: 40px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            border-bottom: 2px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .content {
            font-size: 16px;
            white-space: pre-wrap;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎤 טקסט מומר - STT עברית</h1>
        <p>נוצר ב: ${new Date().toLocaleString('he-IL')}</p>
    </div>
    <div class="content">${escapedText}</div>
    <div class="footer">
        <p>נוצר באמצעות STT עברית - Speech to Text</p>
    </div>
</body>
</html>`;
    }

    downloadFile(filename, content, mimeType) {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';

            // מוסיפים את הקישור ל-dom כדי להבטיח שהדפדפן מזהה אותו
            document.body.appendChild(link);

            // טריגר ללחיצה
            link.click();

            // נקה לאחר קצת זמן
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Error in downloadFile:', error);
            throw error;
        }
    }

    appendToOutput(text) {
        const currentText = this.outputText.value;
        this.outputText.value = currentText + (currentText ? ' ' : '') + text;

        // גלילה אוטומטית לתחתית
        this.outputText.scrollTop = this.outputText.scrollHeight;

        // עדכון כפתור ההורדה
        this.updateDownloadButton();
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

    updateDownloadButton() {
        const hasText = this.outputText.value.trim().length > 0;
        if (this.downloadBtn) {
            this.downloadBtn.disabled = !hasText;
        }
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
                errorMessage = 'לא זוהה דיבור - נסה לדבר יותר חזק';
                break;
            case 'audio-capture':
                errorMessage = 'בעיה בגישה למיקרופון - בדוק הרשאות';
                break;
            case 'not-allowed':
                errorMessage = 'אין הרשאה למיקרופון - לחץ על האייקון בכתובת';
                break;
            case 'network':
                errorMessage = 'בעיית רשת - בדוק חיבור לאינטרנט';
                break;
            case 'service-not-allowed':
                errorMessage = 'השירות לא זמין - נסה שוב';
                break;
            case 'bad-grammar':
                errorMessage = 'בעיה בדקדוק - נסה לדבר יותר ברור';
                break;
            case 'language-not-supported':
                errorMessage = 'השפה לא נתמכת - נסה אנגלית';
                break;
            case 'aborted':
                errorMessage = 'ההקלטה בוטלה';
                break;
        }

        this.updateStatus(`שגיאה: ${errorMessage}`, 'error');
    }
}

// אתחול האפליקציה כשהדף נטען
document.addEventListener('DOMContentLoaded', () => {
    const app = new SpeechToText();
    // אתחול ראשוני לכפתור ההורדה
    setTimeout(() => {
        if (app.updateDownloadButton) {
            app.updateDownloadButton();
        }
    }, 100);
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

    // Ctrl+S להורדת הקובץ
    if (e.code === 'KeyS' && e.ctrlKey) {
        e.preventDefault();
        document.getElementById('downloadBtn').click();
    }
});
