let snapScriptPromise;

export async function payWithMidtrans(payment, callbacks) {
    if (!payment.snap_token || !payment.client_key) {
        throw new Error('Informasi pembayaran Midtrans tidak lengkap.');
    }

    if (!window.snap?.pay) {
        if (!snapScriptPromise) {
            snapScriptPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const baseUrl = payment.is_production
                    ? 'https://app.midtrans.com'
                    : 'https://app.sandbox.midtrans.com';

                script.src = `${baseUrl}/snap/snap.js`;
                script.async = true;
                script.dataset.clientKey = payment.client_key;
                script.onload = () => {
                    if (window.snap?.pay) {
                        resolve(window.snap);
                    } else {
                        snapScriptPromise = undefined;
                        reject(new Error('Midtrans Snap gagal dimuat.'));
                    }
                };
                script.onerror = () => {
                    snapScriptPromise = undefined;
                    reject(new Error('Tidak dapat memuat halaman pembayaran Midtrans.'));
                };

                document.head.appendChild(script);
            });
        }

        await snapScriptPromise;
    }

    return new Promise((resolve, reject) => {
        let completed = false;
        const complete = (callback, result) => {
            if (completed) {
                return;
            }

            completed = true;

            try {
                callback?.(result);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        };

        window.snap.pay(payment.snap_token, {
            ...callbacks,
            onSuccess: (result) => complete(callbacks.onSuccess, result),
            onPending: (result) => complete(callbacks.onPending, result),
            onError: (result) => complete(callbacks.onError, result),
            onClose: (result) => complete(callbacks.onClose, result),
        });
    });
}
