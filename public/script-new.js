document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('compatibilityForm');
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
        compareBtn.disabled = true;
        compareBtn.textContent = '🎬 Analyzing...';
        compareBtn.classList.add('bg-gray-500');
        compareBtn.classList.remove('bg-blue-700', 'hover:bg-blue-800');
    }
    
    function hideLoading() {
        compareBtn.disabled = false;
        compareBtn.textContent = 'Analyze Compatibility';
        compareBtn.classList.remove('bg-gray-500');
        compareBtn.classList.add('bg-blue-700', 'hover:bg-blue-800');
    }
    
    function showResults(data) {
        hideLoading();
        
        const { compatibility, user1, user2 } = data;
        
        // Update stats
        document.getElementById('compatibilityScore').textContent = `${compatibility.compatibilityScore}%`;
        document.getElementById('totalFilms').textContent = compatibility.totalSharedFilms;
        document.getElementById('closeMatchesCount').textContent = compatibility.sharedFilmsCount;
        
        const starText = compatibility.averageRatingDifference === 1 ? 'star' : 'stars';
        document.getElementById('avgDifference').textContent = `${compatibility.averageRatingDifference} ${starText}`;
        
        // Helper function to format rating as stars
        function formatRating(rating) {
            const fullStars = Math.floor(rating);
            const halfStar = rating % 1 >= 0.5;
            return '★'.repeat(fullStars) + (halfStar ? '½' : '');
        }
        
        // Display matches
        const matchesList = document.getElementById('matchesList');
        if (compatibility.closeMatches && compatibility.closeMatches.length > 0) {
            matchesList.innerHTML = compatibility.closeMatches.map((film, index) => `
                <a href="${film.url || '#'}" target="_blank" rel="noopener noreferrer" 
                   class="block ${index % 2 === 0 ? 'bg-blue-800' : 'bg-blue-600'} text-white py-3 px-6 hover:bg-blue-500 transition-all">
                    <div class="font-semibold">${film.title}</div>
                    <div class="text-sm text-blue-200">
                        ${user1}: ${formatRating(film.user1Rating)} • ${user2}: ${formatRating(film.user2Rating)}
                    </div>
                </a>
            `).join('');
        } else {
            matchesList.innerHTML = '<div class="text-gray-700">No close matches found</div>';
        }
        
        // Display mismatches
        const mismatchesList = document.getElementById('mismatchesList');
        if (compatibility.biggestDifferences && compatibility.biggestDifferences.length > 0) {
            mismatchesList.innerHTML = compatibility.biggestDifferences.map((film, index) => `
                <a href="${film.url || '#'}" target="_blank" rel="noopener noreferrer" 
                   class="block ${index % 2 === 0 ? 'bg-red-600' : 'bg-red-400'} text-white py-3 px-6 hover:bg-red-300 transition-all">
                    <div class="font-semibold">${film.title}</div>
                    <div class="text-sm text-red-100">
                        ${user1}: ${formatRating(film.user1Rating)} • ${user2}: ${formatRating(film.user2Rating)}
                    </div>
                </a>
            `).join('');
        } else {
            mismatchesList.innerHTML = '<div class="text-gray-700">No major disagreements</div>';
        }
        
        
        results.classList.remove('hidden');
    }
    
    function showError(message) {
        hideLoading();
        document.getElementById('errorMessage').textContent = message;
        error.classList.remove('hidden');
    }
    
    function hideAllMessages() {
        results.classList.add('hidden');
        error.classList.add('hidden');
    }
});