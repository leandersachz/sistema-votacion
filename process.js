
        // Base de datos PouchDB
        let db;
        
        // Datos de ejemplo
        const candidates = [
            { id: 1, name: "María González", party: "Partido Progresista", photo: "https://randomuser.me/api/portraits/women/32.jpg", color: "#3498db" },
            { id: 2, name: "Carlos Rodríguez", party: "Alianza Verde", photo: "https://randomuser.me/api/portraits/men/22.jpg", color: "#27ae60" },
            { id: 3, name: "Ana Martínez", party: "Unión Democrática", photo: "https://randomuser.me/api/portraits/women/65.jpg", color: "#e74c3c" },
            { id: 4, name: "Javier López", party: "Partido del Pueblo", photo: "https://randomuser.me/api/portraits/men/75.jpg", color: "#f39c12" }
        ];
        
        // Códigos de acceso
        const accessCode = "1234";
        const adminCode = "admin123";
        
        // Variables globales
        let selectedCandidate = null;
        let currentModalAction = null;
        
        // ========== FUNCIONES DE BASE DE DATOS ==========
        
        // Inicializar base de datos
        async function initDatabase() {
            try {
                db = new PouchDB('voting_system_db', { 
                    auto_compaction: true,
                    adapter: 'idb'
                });
                
                // Inicializar datos si no existen
                await initializeData();
                return true;
            } catch (error) {
                console.error('Error inicializando base de datos:', error);
                return false;
            }
        }
        
        // Inicializar datos por primera vez
        async function initializeData() {
            try {
                // Intentar obtener datos existentes
                const existingData = await db.get('app_data');
                return existingData;
            } catch (error) {
                if (error.status === 404) {
                    // No existe, crear datos iniciales
                    const initialData = {
                        _id: 'app_data',
                        votes: {},
                        votedUsers: [],
                        totalVotes: 0,
                        candidates: candidates,
                        createdAt: new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                    };
                    
                    await db.put(initialData);
                    return initialData;
                }
                throw error;
            }
        }
        
        // Guardar voto en la base de datos
        async function saveVote(candidateId, userId = 'default') {
            try {
                // Obtener datos actuales
                const doc = await db.get('app_data');
                
                // Actualizar votos
                doc.votes[candidateId] = (doc.votes[candidateId] || 0) + 1;
                doc.totalVotes++;
                
                // Marcar usuario como votado
                if (!doc.votedUsers.includes(userId)) {
                    doc.votedUsers.push(userId);
                }
                
                doc.lastUpdated = new Date().toISOString();
                
                // Guardar cambios
                await db.put(doc);
                return true;
            } catch (error) {
                console.error('Error guardando voto:', error);
                return false;
            }
        }
        
        // Obtener datos de votación
        async function getVotingData() {
            try {
                const doc = await db.get('app_data');
                return doc;
            } catch (error) {
                console.error('Error obteniendo datos:', error);
                return {
                    votes: {},
                    votedUsers: [],
                    totalVotes: 0,
                    candidates: candidates
                };
            }
        }
        
        // Verificar si ya se votó
        async function hasVoted(userId = 'default') {
            try {
                const doc = await db.get('app_data');
                return doc.votedUsers.includes(userId);
            } catch (error) {
                return false;
            }
        }
        
        // Limpiar todos los votos
        async function clearAllVotes() {
            try {
                const doc = await db.get('app_data');
                doc.votes = {};
                doc.votedUsers = [];
                doc.totalVotes = 0;
                doc.lastUpdated = new Date().toISOString();
                
                await db.put(doc);
                return true;
            } catch (error) {
                console.error('Error eliminando votos:', error);
                return false;
            }
        }
        
        // ========== FUNCIONES DE EXPORTACIÓN ==========
        
        // Exportar a Excel
        async function exportToExcel() {
            try {
                const data = await getVotingData();
                
                // Preparar datos para Excel
                const excelData = [];
                
                // Encabezados
                excelData.push(['SISTEMA DE VOTACIÓN - REPORTE DE RESULTADOS']);
                excelData.push(['Fecha de exportación:', new Date().toLocaleString()]);
                excelData.push(['Total de votos:', data.totalVotes]);
                excelData.push(['']);
                
                // Encabezados de la tabla
                excelData.push(['Candidato', 'Partido', 'Votos', 'Porcentaje']);
                
                // Datos de candidatos
                let totalVotes = data.totalVotes || 0;
                
                candidates.forEach(candidate => {
                    const voteCount = data.votes[candidate.id] || 0;
                    const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(2) + '%' : '0%';
                    
                    excelData.push([
                        candidate.name,
                        candidate.party,
                        voteCount,
                        percentage
                    ]);
                });
                
                // Totales
                excelData.push([]);
                excelData.push(['TOTAL GENERAL', '', totalVotes, '100%']);
                
                // Crear libro de Excel
                const ws = XLSX.utils.aoa_to_sheet(excelData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Resultados Votación");
                
                // Exportar
                const fileName = `resultados_votacion_${new Date().toISOString().split('T')[0]}.xlsx`;
                XLSX.writeFile(wb, fileName);
                
                alert('Datos exportados a Excel correctamente');
                
            } catch (error) {
                console.error('Error exportando a Excel:', error);
                alert('Error al exportar a Excel');
            }
        }
        
        // Exportar a JSON
        async function exportToJSON() {
            try {
                const data = await getVotingData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `votos_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                alert('Datos exportados a JSON correctamente');
            } catch (error) {
                console.error('Error exportando datos:', error);
                alert('Error al exportar datos');
            }
        }
        
        // ========== FUNCIONES DE LA APLICACIÓN ==========
        
        // Inicializar la aplicación
        async function initApp() {
            const dbReady = await initDatabase();
            
            if (dbReady) {
                // Verificar si ya se votó para mostrar pantalla de bloqueo
                const voted = await hasVoted();
                if (voted) {
                    showLockScreen();
                } else {
                    showLoginScreen();
                }
                renderCandidates();
            } else {
                showLoginScreen();
                renderCandidates();
            }
        }
        
        // Mostrar pantalla de login
        function showLoginScreen() {
            hideAllScreens();
            document.getElementById('login-screen').classList.add('active');
            document.getElementById('access-code').value = '';
        }
        
        // Mostrar pantalla de bloqueo
        function showLockScreen() {
            hideAllScreens();
            document.getElementById('lock-screen').classList.add('active');
        }
        
        // Mostrar login de administrador
        function showAdminLogin() {
            hideAllScreens();
            document.getElementById('admin-screen').classList.add('active');
        }
        
        // Verificar código de acceso
        function checkAccessCode() {
            const code = document.getElementById('access-code').value;
            if (code === accessCode) {
                hideAllScreens();
                document.getElementById('voting-screen').classList.add('active');
            } else {
                alert("Código de acceso incorrecto. Intente nuevamente.");
            }
        }
        
        // Verificar código de administrador
        function checkAdminCode() {
            const code = document.getElementById('admin-code').value;
            if (code === adminCode) {
                showResults();
            } else {
                alert("Código de administrador incorrecto");
            }
        }
        
        // Renderizar lista de candidatos
        function renderCandidates() {
            const container = document.getElementById('candidates-list');
            container.innerHTML = '';
            
            candidates.forEach(candidate => {
                const candidateElement = document.createElement('div');
                candidateElement.className = 'candidate';
                candidateElement.innerHTML = `
                    <img src="${candidate.photo}" alt="${candidate.name}">
                    <div class="candidate-info">
                        <h3>${candidate.name}</h3>
                        <p>${candidate.party}</p>
                    </div>
                `;
                candidateElement.addEventListener('click', () => selectCandidate(candidate));
                container.appendChild(candidateElement);
            });
        }
        
        // Seleccionar candidato
        function selectCandidate(candidate) {
            selectedCandidate = candidate;
            hideAllScreens();
            document.getElementById('confirmation-screen').classList.add('active');
            
            const infoContainer = document.getElementById('selected-candidate-info');
            infoContainer.innerHTML = `
                <div class="candidate">
                    <img src="${candidate.photo}" alt="${candidate.name}">
                    <div class="candidate-info">
                        <h3>${candidate.name}</h3>
                        <p>${candidate.party}</p>
                    </div>
                </div>
                <p style="text-align: center; margin: 20px 0; font-size: 18px;">¿Está seguro de que desea votar por este candidato?</p>
            `;
        }
        
        // Volver a la pantalla de votación
        function goBackToVoting() {
            hideAllScreens();
            document.getElementById('voting-screen').classList.add('active');
        }
        
        // Emitir el voto
        async function castVote() {
            const success = await saveVote(selectedCandidate.id);
            
            if (success) {
                showLockScreen();
            } else {
                alert('Error al guardar el voto. Intente nuevamente.');
                goBackToVoting();
            }
        }
        
        // Mostrar resultados
        async function showResults() {
            hideAllScreens();
            document.getElementById('results-screen').classList.add('active');
            
            const data = await getVotingData();
            const votes = data.votes || {};
            const totalVotes = data.totalVotes || 0;
            
            const container = document.getElementById('results-container');
            container.innerHTML = '';
            
            if (totalVotes === 0) {
                container.innerHTML = '<p style="text-align: center; margin: 20px 0;">No hay votos registrados todavía.</p>';
                document.getElementById('bar-chart').innerHTML = '';
                document.getElementById('pie-chart').innerHTML = '';
                return;
            }
            
            // Crear elementos de resultados para cada candidato
            candidates.forEach(candidate => {
                const voteCount = votes[candidate.id] || 0;
                const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.innerHTML = `
                    <div class="result-candidate">
                        <img src="${candidate.photo}" alt="${candidate.name}">
                        <div>
                            <strong>${candidate.name}</strong>
                            <div style="font-size: 12px; color: #7f8c8d;">${candidate.party}</div>
                        </div>
                    </div>
                    <div class="result-stats">
                        <div class="progress-bar">
                            <div class="progress" style="width: ${percentage}%; background: ${candidate.color};"></div>
                        </div>
                        <div class="result-numbers">
                            <div>${voteCount} voto${voteCount !== 1 ? 's' : ''}</div>
                            <div style="font-size: 14px; color: #7f8c8d;">${percentage.toFixed(1)}%</div>
                        </div>
                    </div>
                `;
                container.appendChild(resultItem);
            });
            
            const totalElement = document.createElement('div');
            totalElement.className = 'result-item';
            totalElement.style.fontWeight = 'bold';
            totalElement.style.borderTop = '2px solid #3498db';
            totalElement.style.paddingTop = '15px';
            totalElement.innerHTML = `
                <div class="result-candidate">
                    <strong>Total de votos</strong>
                </div>
                <div class="result-stats">
                    <div class="progress-bar">
                        <div class="progress" style="width: 100%; background: #2c3e50;"></div>
                    </div>
                    <div class="result-numbers">
                        <div>${totalVotes} voto${totalVotes !== 1 ? 's' : ''}</div>
                        <div style="font-size: 14px; color: #7f8c8d;">100%</div>
                    </div>
                </div>
            `;
            container.appendChild(totalElement);
            
            // Generar gráficos
            generateBarChart(votes, totalVotes);
            generatePieChart(votes, totalVotes);
        }
        
        // Generar gráfico de barras
        function generateBarChart(votes, totalVotes) {
            const container = document.getElementById('bar-chart');
            container.innerHTML = '';
            
            const maxVotes = Math.max(...Object.values(votes), 1);
            
            candidates.forEach(candidate => {
                const voteCount = votes[candidate.id] || 0;
                const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                const barHeight = totalVotes > 0 ? (voteCount / maxVotes) * 100 : 0;
                
                const barContainer = document.createElement('div');
                barContainer.style.display = 'flex';
                barContainer.style.alignItems = 'center';
                barContainer.style.marginBottom = '10px';
                barContainer.style.height = '40px';
                
                barContainer.innerHTML = `
                    <div style="width: 100px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${candidate.name}
                    </div>
                    <div style="flex: 1; height: 20px; background: #ecf0f1; border-radius: 10px; overflow: hidden; margin: 0 10px;">
                        <div style="height: 100%; width: ${barHeight}%; background: ${candidate.color}; border-radius: 10px;"></div>
                    </div>
                    <div style="width: 60px; text-align: right; font-size: 14px;">
                        ${voteCount} (${percentage.toFixed(1)}%)
                    </div>
                `;
                
                container.appendChild(barContainer);
            });
        }
        
        // Generar gráfico circular
        function generatePieChart(votes, totalVotes) {
            const container = document.getElementById('pie-chart');
            container.innerHTML = '';
            
            if (totalVotes === 0) return;
            
            // Crear canvas para el gráfico circular
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            container.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(centerX, centerY) - 10;
            
            let startAngle = 0;
            
            // Dibujar los segmentos del gráfico circular
            candidates.forEach(candidate => {
                const voteCount = votes[candidate.id] || 0;
                if (voteCount === 0) return;
                
                const sliceAngle = (voteCount / totalVotes) * 2 * Math.PI;
                
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
                ctx.closePath();
                ctx.fillStyle = candidate.color;
                ctx.fill();
                
                startAngle += sliceAngle;
            });
            
            // Dibujar un círculo blanco en el centro para hacerlo tipo donut
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
            
            // Añadir leyenda
            const legend = document.createElement('div');
            legend.style.display = 'flex';
            legend.style.flexWrap = 'wrap';
            legend.style.justifyContent = 'center';
            legend.style.marginTop = '15px';
            
            candidates.forEach(candidate => {
                const voteCount = votes[candidate.id] || 0;
                if (voteCount === 0) return;
                
                const legendItem = document.createElement('div');
                legendItem.style.display = 'flex';
                legendItem.style.alignItems = 'center';
                legendItem.style.margin = '5px 10px';
                legendItem.style.fontSize = '12px';
                
                legendItem.innerHTML = `
                    <div style="width: 12px; height: 12px; background: ${candidate.color}; border-radius: 3px; margin-right: 5px;"></div>
                    ${candidate.name}
                `;
                
                legend.appendChild(legendItem);
            });
            
            container.appendChild(legend);
        }
        
        // Ocultar todas las pantallas
        function hideAllScreens() {
            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => {
                screen.classList.remove('active');
            });
        }
        
        // Mostrar modal de confirmación
        function showModal(title, message, confirmAction) {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-message').textContent = message;
            currentModalAction = confirmAction;
            document.getElementById('confirm-modal').style.display = 'flex';
        }
        
        // Ocultar modal
        function hideModal() {
            document.getElementById('confirm-modal').style.display = 'none';
            currentModalAction = null;
        }
        
        // Confirmar acción del modal
        function modalConfirmAction() {
            if (currentModalAction) {
                currentModalAction();
            }
            hideModal();
        }
        
        // Confirmar eliminación de votos
        function confirmClearVotes() {
            showModal(
                'Eliminar todos los votos', 
                '¿Está seguro de que desea eliminar todos los votos? Esta acción no se puede deshacer.', 
                clearAllVotesAndRefresh
            );
        }
        
        // Eliminar todos los votos y actualizar vista
        async function clearAllVotesAndRefresh() {
            const success = await clearAllVotes();
            if (success) {
                showResults();
                alert('Todos los votos han sido eliminados.');
            } else {
                alert('Error al eliminar los votos.');
            }
        }
        
        // Reiniciar aplicación de votación
        function resetVotingApp() {
            showModal(
                'Reiniciar aplicación', 
                '¿Está seguro de que desea reiniciar la aplicación? Esto eliminará todos los votos y restablecerá la aplicación a su estado inicial.', 
                performAppReset
            );
        }
        
        // Realizar reinicio de la aplicación
        async function performAppReset() {
            const success = await clearAllVotes();
            if (success) {
                showLoginScreen();
                alert('La aplicación se ha reiniciado correctamente.');
            } else {
                alert('Error al reiniciar la aplicación.');
            }
        }
        
        // Inicializar la aplicación cuando se cargue la página
        window.onload = initApp;
