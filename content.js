// --- BASE DE DATOS DE SITIOS (El usuario no ve esto, la extensión lo usa automáticamente) ---
const SITES_DB = {
    'mercadolibre.com.ar': {
        name: "MercadoLibre",
        selectors: {
            product: 'li.ui-search-layout__item, div.poly-card',
            price: '.price-tag-fraction, .andes-money-amount__fraction'
        }
    },
    'coto.com.ar': {
        name: "Coto Digital",
        selectors: {
            product: '.product-item, .productWrapper, li.product',
            price: '.price, .product-price, span[itemprop="price"], .atg_store_productPrice'
        }
    },
    'carrefour.com.ar': {
        name: "Carrefour",
        selectors: {
            product: '.product-card, .product-item',
            price: '.product-price, .valorg'
        }
    },
    'fravega.com': {
        name: "Frávega",
        selectors: {
            product: '.product-card, .product-wrapper',
            price: '.price-tag-fraction, span.price'
        }
    },
    'garbarino.com': {
        name: "Garbarino",
        selectors: {
            product: '.product-item, .card-product',
            price: '.price, .value-item'
        }
    },
    'tiendamia.com': {
        name: "Tiendamia",
        selectors: {
            product: '.product-item, .item-product',
            price: '.price, .price-standard'
        }
    }
};

// --- LÓGICA PRINCIPAL ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "iniciar_filtrado") {
        const resultado = procesarSitio(request.presupuesto);
        sendResponse({ status: resultado });
    }
});

function procesarSitio(presupuesto) {
    // 1. Identificar en qué sitio estamos
    const hostname = window.location.hostname;
    let config = null;

    // Buscar configuración en nuestra DB
    for (const domain in SITES_DB) {
        if (hostname.includes(domain)) {
            config = SITES_DB[domain];
            console.log(`Super Tool: Sitio detectado ${config.name}`);
            break;
        }
    }

    // 2. Si no está en la DB, usar Modo Inteligente (Genérico)
    if (!config) {
        console.log("Super Tool: Sitio desconocido. Activando Modo Inteligente...");
        config = {
            name: "Sitio Genérico",
            selectors: {
                // Intenta adivinar productos buscando contenedores comunes
                product: 'div.product, div.item, li.product, article.product, div[data-product-id]',
                // Intenta adivinar precios buscando el símbolo $                 price: '.price, .product-price, span[class*="price"]'
            }
        };
    }

    // 3. Ejecutar filtrado
    const items = document.querySelectorAll(config.selectors.product);
    
    if (items.length === 0) {
        return "No se encontraron productos. Recarga la página.";
    }

    let countOk = 0;
    let countNo = 0;

    items.forEach(item => {
        // Buscamos el precio. A veces está en un span, a veces en un div
        const priceEl = item.querySelector(config.selectors.price);
        
        // Si encontramos un precio, procesamos
        if (priceEl) {
            // LIMPIEZA DE TEXTO: Elimina puntos, comas, y símbolos no numéricos
            // Pero mantenemos el número entero final.
            const rawText = priceEl.textContent;
            const priceClean = rawText.replace(/\./g, '').replace(/,/g, '').replace(/\$/g, '').replace(/ARS/g, '').trim();
            const price = parseInt(priceClean);

            if (!isNaN(price)) {
                if (price <= presupuesto) {
                    // ENTRA EN PRESUPUESTO
                    countOk++;
                    item.style.opacity = "1";
                    item.style.display = ""; // Asegura visibilidad
                    item.style.border = "2px solid #10b981";
                    item.style.backgroundColor = "#ecfdf5";
                    
                    // Pequeña etiqueta de confirmación
                    if (!item.querySelector('.super-tool-badge')) {
                        const badge = document.createElement('div');
                        badge.className = 'super-tool-badge';
                        badge.innerText = "✅ Entra";
                        badge.style.cssText = "position:absolute; top:5px; right:5px; background:#10b981; color:white; padding:2px 6px; font-size:10px; border-radius:3px; z-index:9999;";
                        
                        // Solo si el item tiene posición relativa/absoluta funcionará bien
                        if (window.getComputedStyle(item).position === 'static') {
                            item.style.position = 'relative';
                        }
                        item.appendChild(badge);
                    }
                } else {
                    // FUERA DE PRESUPUESTO
                    countNo++;
                    item.style.opacity = "0.2";
                    item.style.border = "none";
                    // Ocultamos completamente si se desea:
                    // item.style.display = "none"; 
                }
            }
        }
    });

    mostrarDashboard(presupuesto, countOk, countNo);
    return `${countOk} productos encontrados`;
}

function mostrarDashboard(presupuesto, ok, no) {
    // Eliminar dashboard previo si existe
    const oldDash = document.getElementById('super-tool-dashboard');
    if (oldDash) oldDash.remove();

    const dash = document.createElement('div');
    dash.id = 'super-tool-dashboard';
    dash.innerHTML = `
        <div style="font-weight:bold; margin-bottom:8px;">🛒 Filtro Activo</div>
        <div>Presupuesto: <b>$${presupuesto.toLocaleString('es-AR')}</b></div>
        <div style="color:green; margin-top:5px;">Puedes comprar: <b>${ok}</b></div>
        <div style="color:red; opacity:0.8;">Muy caros: <b>${no}</b></div>
        <div style="font-size:9px; margin-top:8px; cursor:pointer;" id="close-dash">Cerrar y quitar filtros</div>
    `;

    dash.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        background: white; padding: 15px; border-radius: 8px; 
        box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 999999;
        font-family: sans-serif; font-size: 13px;
        border: 1px solid #ccc;
    `;

    document.body.appendChild(dash);

    // Botón para quitar efectos
    document.getElementById('close-dash').addEventListener('click', () => {
        // Recarga la página para limpiar todo rápido
        location.reload();
    });
}
