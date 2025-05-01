document.addEventListener('DOMContentLoaded', function() {
    const userRole = localStorage.getItem('userRole') || 'user';
    
    const menuItems = {
        admin: [
            { path: '/dashboard', label: 'Dashboard', icon: '📊' },
            { path: '/users', label: 'Gestión de Usuarios', icon: '👥' },
            { path: '/products', label: 'Gestión de Productos', icon: '🛍️' },
            { path: '/orders', label: 'Gestión de Pedidos', icon: '📦' },
            { path: '/reports', label: 'Reportes', icon: '📈' },
            { path: '/settings', label: 'Configuración', icon: '⚙️' }
        ],
        user: [
            { path: '/dashboard', label: 'Dashboard', icon: '📊' },
            { path: '/products', label: 'Productos', icon: '🛍️' },
            { path: '/orders', label: 'Mis Pedidos', icon: '📦' },
            { path: '/profile', label: 'Mi Perfil', icon: '👤' }
        ]
    };

    const currentMenuItems = menuItems[userRole] || menuItems.user;
    const sidebar = document.createElement('div');
    sidebar.className = 'w-64 bg-gray-800 text-white h-screen fixed left-0 top-0 overflow-y-auto';
    
    sidebar.innerHTML = `
        <div class="p-4">
            <h1 class="text-2xl font-bold mb-8">PC HUB</h1>
            <nav>
                <ul class="space-y-2">
                    ${currentMenuItems.map(item => `
                        <li>
                            <a href="${item.path}" 
                               class="flex items-center px-4 py-2 rounded-lg transition-colors hover:bg-gray-700">
                                <span class="mr-3">${item.icon}</span>
                                ${item.label}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </nav>
        </div>
        <div class="absolute bottom-0 w-full p-4 border-t border-gray-700">
            <div class="flex items-center">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    ${userRole === 'admin' ? 'A' : 'U'}
                </div>
                <div>
                    <p class="text-sm font-medium">Rol: ${userRole === 'admin' ? 'Administrador' : 'Usuario'}</p>
                </div>
            </div>
        </div>
    `;

    document.body.insertBefore(sidebar, document.body.firstChild);
    document.body.style.marginLeft = '16rem';
}); 