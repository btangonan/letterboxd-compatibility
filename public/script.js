document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('compatibilityForm');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    const compareBtn = document.getElementById('compareBtn');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username1 = document.getElementById('username1').value.trim();
        const username2 = document.getElementById('username2').value.trim();
        
        if (!username1 || !username2) {
            showError('Please enter both usernames');
            return;
        }
        
        if (username1 === username2) {
            showError('Please enter different usernames');
            return;
        }
        
        hideAllMessages();
        showLoading();
        
        try {
            const response = await fetch('/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username1, username2 })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showResults(data);
            } else {
                showError(data.error || 'An error occurred');
            }
        } catch (err) {
            showError('Failed to connect to server');
        }
    });
    
    function showLoading() {
        loading.classList.remove('hidden');
        compareBtn.disabled = true;
        compareBtn.textContent = 'Analyzing...';
    }
    
    function hideLoading() {
        loading.classList.add('hidden');
        compareBtn.disabled = false;
        compareBtn.textContent = 'Check Compatibility';
    }
    
    function showResults(data) {
        hideLoading();
        
        const { compatibility, user1, user2 } = data;
        
        document.getElementById('compatibilityScore').innerHTML = `
            <h3>Compatibility Score</h3>
            <div class="score">${compatibility.compatibilityScore}%</div>
        `;
        
        document.getElementById('details').innerHTML = `
            <p><strong>Users:</strong> ${user1} & ${user2}</p>
            <p><strong>Shared Films:</strong> ${compatibility.sharedFilmsCount}</p>
            <p><strong>Average Rating Difference:</strong> ${compatibility.averageRatingDifference}/10</p>
        `;
        
        if (compatibility.sharedFilms.length > 0) {
            const filmsHTML = compatibility.sharedFilms.map(film => `
                <div class="film-item">
                    <div class="film-title">${film.title}</div>
                    <div class="film-ratings">
                        <span class="rating">${user1}: ${film.user1Rating}/10</span>
                        <span class="rating">${user2}: ${film.user2Rating}/10</span>
                        <span>Diff: ${film.difference}</span>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('sharedFilms').innerHTML = `
                <h3>Shared Films (Best Matches First)</h3>
                ${filmsHTML}
            `;
        } else {
            document.getElementById('sharedFilms').innerHTML = `
                <h3>No Shared Films Found</h3>
                <p>These users haven't rated any films in common.</p>
            `;
        }
        
        results.classList.remove('hidden');
    }
    
    function showError(message) {
        hideLoading();
        error.textContent = message;
        error.classList.remove('hidden');
    }
    
    function hideAllMessages() {
        loading.classList.add('hidden');
        results.classList.add('hidden');
        error.classList.add('hidden');
    }
});