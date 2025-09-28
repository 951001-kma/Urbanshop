// Dashboard Manager actualizado para MongoDB
class DashboardManager {
    constructor() {
        this.apiBaseUrl = '/api';
        this.charts = {};
        
        // Obtener authManager de forma segura - AGREGAR ESTAS LÍNEAS
        this.authManager = window.authManager;
        if (!this.authManager) {
            // Si no existe, crear instancia
            this.authManager = new AuthManager();
            window.authManager = this.authManager;
        }
        
        this.init();
    }

    init() {
             
        // 1. Verificar acceso usando el AuthManager
        if (this.authManager && !this.authManager.validatePageAccess()) {
            return;
        }
        
        // 2. Filtrar menú según rol
        if (this.authManager) {
            this.authManager.filterMenuByRole();
        } else {
            // Verificación de respaldo por si authManager no está disponible
            if (!this.authManager.isLoggedIn()) {
                window.location.href = 'index.html';
                return;
            }
        }
        
        // 3. Si pasó todas las validaciones, cargar la página
        this.loadUserInfo();
        this.loadDashboardData();
        this.setupEventListeners();
        this.setupCharts();
    }

      async loadDashboardData() {
        try {
          this.showLoadingState();
          
          const [kpisData, salesTrend, lowStockData, recentSales] = await Promise.all([
            this.fetchData('/dashboard/kpis'),
            this.fetchData('/dashboard/sales-trend'),
            this.fetchData('/dashboard/low-stock'),
            this.fetchData('/sales/recent')
          ]);

          this.updateKPIs(kpisData.kpis);
          this.updateSalesChart(salesTrend.salesTrend);
          this.updateTopProductsChart(kpisData.topProducts || []);
          this.updateLowStockTable(lowStockData.lowStockProducts || []);
          this.updateRecentSalesTable(recentSales.sales || []);

        } catch (error) {
          console.error('Error loading dashboard data:', error);
          this.showError('Error al cargar los datos del dashboard');
        }
      }

      async fetchData(endpoint) {
        const token = this.getToken();
        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      }

      showLoadingState() {
        document.getElementById('low-stock-body').innerHTML = 
          '<tr><td colspan="4" style="padding:20px; text-align:center; color:#6b7280;">Cargando...</td></tr>';
        document.getElementById('recent-sales-body').innerHTML = 
          '<tr><td colspan="4" style="padding:20px; text-align:center; color:#6b7280;">Cargando...</td></tr>';
      }

      updateKPIs(kpis) {
        if (!kpis) return;
        
        // Ventas del día
        document.getElementById('kpi-sales').textContent = 
          `S/ ${(kpis.dailySales || 0).toFixed(2)}`;
        document.getElementById('kpi-sales-count').textContent = 
          `${kpis.salesCount || 0} ventas`;

        // Stock total
        document.getElementById('kpi-stock').textContent = 
          `${kpis.totalStock || 0} ítems`;
        document.getElementById('kpi-products-count').textContent = 
          `${kpis.totalProducts || 0} productos`;

        // Alertas
        document.getElementById('kpi-alerts').textContent = 
          `${kpis.lowStockAlerts || 0} productos`;
      }

      setupCharts() {
        Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
        Chart.defaults.color = '#6b7280';
        Chart.defaults.font.size = 12;
      }

      updateSalesChart(salesData) {
        const ctx = document.getElementById('chart-sales-trend').getContext('2d');
        
        if (this.charts.salesTrend) {
          this.charts.salesTrend.destroy();
        }

        if (!salesData || salesData.length === 0) {
          this.showNoDataChart(ctx, 'chart-sales-trend', 'No hay datos de ventas');
          return;
        }

        const labels = salesData.map(item => {
          const date = new Date(item._id + 'T00:00:00');
          return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        });

        const data = salesData.map(item => item.total || 0);

        this.charts.salesTrend = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Ventas (S/)',
              data: data,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              tension: 0.4,
              fill: true,
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `Ventas: S/ ${context.parsed.y.toFixed(2)}`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                  callback: function(value) {
                    return 'S/ ' + value;
                  }
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        });
      }

      updateTopProductsChart(topProducts) {
        const ctx = document.getElementById('chart-top-products').getContext('2d');
        
        if (this.charts.topProducts) {
          this.charts.topProducts.destroy();
        }

        if (!topProducts || topProducts.length === 0) {
          this.showNoDataChart(ctx, 'chart-top-products', 'No hay datos de productos');
          return;
        }

        const labels = topProducts.map(item => 
          item.productName || item.productInfo?.[0]?.name || 'Producto ' + item._id
        ).slice(0, 5); // Mostrar máximo 5 productos

        const data = topProducts.map(item => item.totalSold || 0).slice(0, 5);

        this.charts.topProducts = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Unidades Vendidas',
              data: data,
              backgroundColor: '#10b981',
              borderColor: '#059669',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                  stepSize: 1
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        });
      }

      showNoDataChart(ctx, canvasId, message) {
        ctx.font = '16px system-ui';
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'center';
        ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
      }

      updateLowStockTable(products) {
        const tbody = document.getElementById('low-stock-body');
        
        if (!products || products.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:#6b7280;">No hay productos con bajo stock</td></tr>';
          return;
        }

        tbody.innerHTML = products.map(product => `
          <tr style="${product.stock <= 3 ? 'background:#fef2f2;' : 'background:#fffbeb;'}">
            <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${product.name || 'N/A'}</td>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${product.category || 'N/A'}</td>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">
              <span style="padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:600; 
                ${product.stock === 0 ? 'background:#ef4444; color:white;' : 
                  product.stock <= 3 ? 'background:#f59e0b; color:white;' : 
                  'background:#10b981; color:white;'}">
                ${product.stock}
              </span>
            </td>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:right;">
              S/ ${(product.price || 0).toFixed(2)}
            </td>
          </tr>
        `).join('');
      }

      updateRecentSalesTable(sales) {
        const tbody = document.getElementById('recent-sales-body');
        
        if (!sales || sales.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:#6b7280;">No hay ventas recientes</td></tr>';
          return;
        }

        tbody.innerHTML = sales.slice(0, 5).map(sale => `
          <tr>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
              <strong>${sale.saleNumber || 'N/A'}</strong>
            </td>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
              ${new Date(sale.createdAt).toLocaleDateString('es-ES')}
            </td>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:right;">
              <strong>S/ ${(sale.total || 0).toFixed(2)}</strong>
            </td>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">
              ${sale.items ? sale.items.length : 0}
            </td>
          </tr>
        `).join('');
      }

      // Métodos de autenticación
      isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true';
      }

      getToken() {
        return localStorage.getItem('token') || '';
      }

      getCurrentUser() {
        return JSON.parse(localStorage.getItem('user') || '{}');
      }

    loadUserInfo() {
        try {
            if (!this.authManager) return;
            
            const user = this.authManager.getCurrentUser();
            const sessionInfo = document.getElementById('session-info');
            
            if (sessionInfo && user?.user?.email) {
                const userInfo = user.user;
                sessionInfo.innerHTML = `👤 <strong>${userInfo.name || userInfo.email}</strong> 
                    <span style="color:#6b7280">(${userInfo.role || 'Usuario'})</span>`;
            }
        } catch (error) {
            console.error('Error en loadUserInfo:', error);
        }
    }

      setupEventListeners() {
        // Botón de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
          });
        }

        // Botón de actualizar
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', () => {
            this.loadDashboardData();
            refreshBtn.textContent = '🔄 Actualizando...';
            setTimeout(() => {
              refreshBtn.textContent = '🔄 Actualizar';
            }, 1000);
          });
        }

        // Actualizar datos cada 2 minutos
        setInterval(() => {
          this.loadDashboardData();
        }, 2 * 60 * 1000);
      }

      handleLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
          localStorage.removeItem('user');
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('token');
          window.location.href = 'index.html';
        }
      }

      showError(message) {
        // Puedes implementar notificaciones toast aquí
        console.error('Dashboard Error:', message);
      }
    }

    // Inicializar dashboard cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
      window.dashboardManager = new DashboardManager();
    });

    document.addEventListener('DOMContentLoaded', () => {
    // Verificar acceso
    if (window.authManager) {
        const hasAccess = window.authManager.checkPageAccess(['Admin', 'Supervisor', 'Vendedor']);
        if (!hasAccess) {
            return;
        }
    }
    
    // Cargar información de usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const sessionInfo = document.getElementById('session-info');
    if (sessionInfo && user.email) {
        sessionInfo.innerHTML = `👤 <strong>${user.name || user.email}</strong> 
            <span style="color:#6b7280">(${user.role || 'Usuario'})</span>`;
    }
});