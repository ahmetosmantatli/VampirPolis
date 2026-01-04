import * as signalR from '@microsoft/signalr';

class SignalRService {
  constructor() {
    this.connection = null;
    this.handlers = new Map();
    this.isConnecting = false;
    this.isConnected = false;
  }

  // Backend'e bağlan
  async connect() {
    // Zaten bağlıysa veya bağlanıyorsa, tekrar deneme
    if (this.isConnected || this.isConnecting) {
      console.log('⚠️ Zaten bağlı veya bağlanıyor, tekrar bağlanmıyor');
      return true;
    }

    this.isConnecting = true;

    // Eğer zaten connection varsa, yeniden oluşturma
    if (!this.connection) {
      // Production için backend URL'ini environment variable'dan al
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5076';
      
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${backendUrl}/gameHub`)
        .configureLogging(signalR.LogLevel.Debug)
        .withAutomaticReconnect([0, 1000, 2000, 5000]) // Agresif reconnect
        .build();

      // Connection kapandığında loglama
      this.connection.onclose((error) => {
        console.error('❌ SignalR bağlantısı kapandı:', error);
        this.isConnected = false;
        this.isConnecting = false;
      });

      // Reconnecting event'i dinle
      this.connection.onreconnecting((error) => {
        console.log('🔄 SignalR yeniden bağlanıyor...', error);
        this.isConnected = false;
      });

      // Reconnected event'i dinle
      this.connection.onreconnected((connectionId) => {
        console.log('✅ SignalR yeniden bağlandı!', connectionId);
        this.isConnected = true;
        this.setupHandlers();
      });
    }

    try {
      await this.connection.start();
      console.log('✅ SignalR Connected!');
      this.isConnected = true;
      this.isConnecting = false;
      this.setupHandlers();
      return true; // Başarılı
    } catch (err) {
      console.error('❌ SignalR Connection Error:', err);
      console.error('Error details:', err.message);
      this.isConnecting = false;
      throw err; // Hatayı fırlat ki .then() çalışmasın
    }
  }

  // Event handler'ları kaydet
  on(eventName, callback) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName).push(callback);
  }

  // Backend'e event gönder
  async invoke(methodName, ...args) {
    // Bağlantı yoksa hata
    if (!this.connection || !this.isConnected) {
      console.error(`❌ Bağlantı yok, ${methodName} çağrılamıyor`);
      return null;
    }
    
    try {
      console.log(`📡 Backend'e gönderiliyor: ${methodName}`);
      return await this.connection.invoke(methodName, ...args);
    } catch (err) {
      console.error(`❌ Backend Hatası: ${methodName}`, err);
      return null;
    }
  }

  // Handler'ları backend'e bağla
  setupHandlers() {
    console.log(`🔗 setupHandlers çağrıldı, ${this.handlers.size} event var`);
    this.handlers.forEach((callbacks, eventName) => {
      console.log(`   📡 Bağlanıyor: ${eventName} (${callbacks.length} callback)`);
      this.connection.on(eventName, (...args) => {
        callbacks.forEach(cb => cb(...args));
      });
    });
    console.log('✅ Tüm event listener\'lar bağlandı');
  }

  // Bağlantıyı kes
  async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.isConnected = false;
      this.isConnecting = false;
      console.log('🔌 SignalR bağlantısı kesildi');
    }
  }
}

export default new SignalRService();