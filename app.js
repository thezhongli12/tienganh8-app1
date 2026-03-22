<script>
    function renderUnitPreview() {
        const grid = document.getElementById('unit-preview');
        if (!grid) return;
        grid.innerHTML = ""; 
        for (let i = 1; i <= 12; i++) {
            // Chuyển hướng sang study kèm tham số ?unit=i
            grid.innerHTML += `
                <div class="unit-item" onclick="window.location.href='/study?unit=${i}'" style="cursor:pointer; border:1px solid #ddd; padding:20px; border-radius:10px; text-align:center;">
                    <h3>Unit ${i}</h3>
                    <p>Bấm để học bài</p>
                </div>`;
        }
    }

    async function checkUserStatus() {
        const res = await fetch('/api/user-status');
        const data = await res.json();
        const authZone = document.getElementById('auth-zone');
        const unitArea = document.getElementById('units-area'); // Cần có ID này ở thẻ div chứa 12 unit

        if (data.loggedIn) {
            authZone.innerHTML = `<span>Chào, <b>${data.username}</b></span> | <a href="/logout">Thoát</a>`;
            if (unitArea) {
                unitArea.style.display = 'block'; 
                renderUnitPreview();
            }
        }
    }
    checkUserStatus();
</script>
