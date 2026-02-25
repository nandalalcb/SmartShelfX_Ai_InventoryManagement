(async () => {
    try {
        // 1. Login as manager
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'manager@smartshelfx.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Logged in successfully', loginData.user.role);

        // 2. See if we have any POs
        const poRes = await fetch('http://localhost:5000/api/purchase-orders', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const poData = await poRes.json();
        const pos = poData.purchaseOrders;
        if (pos.length === 0) {
            console.log('No POs to receive or reject.');
            return;
        }

        const po = pos[0];
        console.log(`PO ID: ${po.id}, Status: ${po.status}`);

        // Try to receive
        if (po.status !== 'RECEIVED') {
            try {
                const receiveRes = await fetch(`http://localhost:5000/api/purchase-orders/${po.id}/receive`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}` }
                });
                const receiveData = await receiveRes.json();
                console.log('Receive status:', receiveRes.status, receiveData);
            } catch (err) {
                console.log('Receive FAILED:', err.message);
            }
        }
    } catch (err) {
        console.error('Error in script:', err.message);
    }
})();
