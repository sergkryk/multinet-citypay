export async function sendSms(phone: string, message: string): Promise<void> {
    try {
        await fetch('http://snmp.multi-net.org/api/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone,
                message
            })
        });
        console.log('SMS sent successfully', phone, message);
    } catch (error) {
        console.error('SMS sending failed:', error);
        // Не прерываем основной процесс если отправка SMS не удалась
    }
} 