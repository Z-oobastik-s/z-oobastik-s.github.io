/**
 * Statistics Module
 * Handles user statistics and localStorage operations
 */

const STORAGE_KEY = 'typeMasterStats';

class Statistics {
    constructor() {
        this.data = this.load();
    }
    
    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load statistics:', e);
        }
        
        return {
            sessions: [],
            totalTime: 0,
            completedLessons: 0,
            bestSpeed: 0,
            averageAccuracy: 0,
            totalSessions: 0,
            totalCharsTyped: 0
        };
    }
    
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save statistics:', e);
        }
    }
    
    addSession(sessionData) {
        const session = {
            timestamp: Date.now(),
            speed: sessionData.speed || 0,
            accuracy: sessionData.accuracy || 0,
            time: sessionData.time || 0,
            errors: sessionData.errors || 0,
            mode: sessionData.mode || 'unknown',
            layout: sessionData.layout || 'ru',
            lessonKey: sessionData.lessonKey || null
        };
        
        this.data.sessions.push(session);
        this.data.totalSessions++;
        this.data.totalTime += session.time;
        // Chars in this session: speed (CPM) * (time in sec / 60)
        const charsThisSession = Math.round((session.speed || 0) * (session.time || 0) / 60);
        this.data.totalCharsTyped = (this.data.totalCharsTyped || 0) + charsThisSession;

        if (session.mode === 'lesson') {
            this.data.completedLessons++;
            
            // Save lesson-specific stats
            if (session.lessonKey) {
                this.updateLessonStats(session.lessonKey, session);
            }
        }
        
        // Update best speed
        if (session.speed > this.data.bestSpeed) {
            this.data.bestSpeed = session.speed;
        }
        
        // Calculate average accuracy
        const totalAccuracy = this.data.sessions.reduce((sum, s) => sum + s.accuracy, 0);
        this.data.averageAccuracy = Math.round(totalAccuracy / this.data.sessions.length);
        
        this.save();
        this.updateDisplay();
    }
    
    updateLessonStats(lessonKey, session) {
        if (!this.data.lessonStats) {
            this.data.lessonStats = {};
        }
        
        if (!this.data.lessonStats[lessonKey] || session.accuracy > this.data.lessonStats[lessonKey].accuracy) {
            this.data.lessonStats[lessonKey] = {
                completed: true,
                accuracy: session.accuracy,
                speed: session.speed,
                bestTime: session.time,
                timestamp: session.timestamp
            };
        }
    }
    
    getLessonStats(lessonKey) {
        if (!this.data.lessonStats) {
            return null;
        }
        return this.data.lessonStats[lessonKey] || null;
    }
    
    /** Суммарное число уроков по всем уровням и всем языкам (RU, EN, UA) */
    getTotalLessonsCount() {
        if (typeof LESSONS_DATA === 'undefined') return 0;
        return ['beginner', 'medium', 'advanced'].reduce(
            (sum, level) => sum + (LESSONS_DATA[level] && LESSONS_DATA[level].lessons ? LESSONS_DATA[level].lessons.length : 0),
            0
        );
    }
    
    updateDisplay() {
        // Update stats preview on home screen - ОПТИМИЗИРОВАНА с кэшированием
        const bestSpeedEl = document.getElementById('bestSpeed');
        const avgAccuracyEl = document.getElementById('avgAccuracy');
        const completedLessonsEl = document.getElementById('completedLessons');
        const totalLessonsCountEl = document.getElementById('totalLessonsCount');
        const totalTimeEl = document.getElementById('totalTime');
        const totalSessionsEl = document.getElementById('totalSessions');
        const progressLessonsBar = document.getElementById('progressLessonsBar');
        
        if (bestSpeedEl && bestSpeedEl.textContent !== String(this.data.bestSpeed)) {
            bestSpeedEl.textContent = this.data.bestSpeed;
        }
        
        const accuracyText = this.data.averageAccuracy + '%';
        if (avgAccuracyEl && avgAccuracyEl.textContent !== accuracyText) {
            avgAccuracyEl.textContent = accuracyText;
        }
        
        const uniqueLessons = this.data.lessonStats ? Object.keys(this.data.lessonStats).length : 0;
        if (completedLessonsEl && completedLessonsEl.textContent !== String(uniqueLessons)) {
            completedLessonsEl.textContent = uniqueLessons;
        }
        
        const totalLessons = this.getTotalLessonsCount();
        if (totalLessonsCountEl && totalLessonsCountEl.textContent !== String(totalLessons)) {
            totalLessonsCountEl.textContent = totalLessons;
        }
        
        if (progressLessonsBar) {
            const pct = totalLessons > 0 ? Math.min(100, Math.round((uniqueLessons / totalLessons) * 100)) : 0;
            progressLessonsBar.style.width = pct + '%';
        }
        
        if (totalTimeEl) {
            const minutes = Math.floor(this.data.totalTime / 60);
            const hours = Math.floor(minutes / 60);
            const timeText = hours > 0 ? hours + 'ч' : minutes + 'м';
            if (totalTimeEl.textContent !== timeText) {
                totalTimeEl.textContent = timeText;
            }
        }
        
        if (totalSessionsEl && totalSessionsEl.textContent !== String(this.data.totalSessions)) {
            totalSessionsEl.textContent = this.data.totalSessions;
        }
    }
    
    getRecentSessions(count = 10) {
        return this.data.sessions.slice(-count).reverse();
    }
    
    getBestSession() {
        if (this.data.sessions.length === 0) return null;
        
        return this.data.sessions.reduce((best, session) => {
            if (!best || session.speed > best.speed) {
                return session;
            }
            return best;
        }, null);
    }
    
    getUniqueLessonsCount() {
        return this.data.lessonStats ? Object.keys(this.data.lessonStats).length : 0;
    }

    getTotalWords() {
        return Math.floor((this.data.totalCharsTyped || 0) / 5);
    }

    reset() {
        if (confirm('Вы уверены, что хотите сбросить всю статистику?')) {
            this.data = {
                sessions: [],
                totalTime: 0,
                completedLessons: 0,
                bestSpeed: 0,
                averageAccuracy: 0,
                totalSessions: 0,
                totalCharsTyped: 0
            };
            this.save();
            this.updateDisplay();
        }
    }
}

// Create global instance
const stats = new Statistics();

// Export
window.statsModule = stats;
