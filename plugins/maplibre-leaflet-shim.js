/**
 * Compatibility shim: implements the subset of the Leaflet API actually used
 * across FestLift's map pages, backed by MapLibre GL + OpenFreeMap vector tiles
 * (full street-level detail, no raster tile provider policy/paywall risk).
 * Load order: maplibre-gl.js, then this file, in place of leaflet.js.
 * Consuming pages keep calling `L.map(...)`, `L.marker(...)`, etc. unchanged.
 */
(function (global) {
    if (typeof maplibregl === 'undefined') {
        console.error('maplibre-leaflet-shim: maplibregl not loaded before this script');
        return;
    }

    var STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
    var ATTRIBUTION = '© OpenStreetMap contributors · © OpenFreeMap';
    var counter = 0;

    // ── coordinate helpers (Leaflet = [lat,lng] / {lat,lng}; MapLibre = [lng,lat]) ──
    function normalizeLatLng(input) {
        if (input == null) return { lat: 0, lng: 0 };
        if (Array.isArray(input)) return { lat: input[0], lng: input[1] };
        if (typeof input.lat === 'function') return { lat: input.lat(), lng: input.lng() };
        return { lat: input.lat, lng: input.lng };
    }
    function toLngLatArr(input) {
        var ll = normalizeLatLng(input);
        return [ll.lng, ll.lat];
    }
    function underlyingMap(map) { return map && map._maplibreMap ? map._maplibreMap : map; }

    // ── bounds helper (supports Leaflet's LatLngBounds.pad()/.extend()) ──
    function makeBounds(minLat, minLng, maxLat, maxLng) {
        return {
            _sw: { lat: minLat, lng: minLng },
            _ne: { lat: maxLat, lng: maxLng },
            pad: function (ratio) {
                var latPad = (maxLat - minLat) * ratio || 0.01;
                var lngPad = (maxLng - minLng) * ratio || 0.01;
                return makeBounds(minLat - latPad, minLng - lngPad, maxLat + latPad, maxLng + lngPad);
            },
            extend: function (latlng) {
                var ll = normalizeLatLng(latlng);
                return makeBounds(Math.min(minLat, ll.lat), Math.min(minLng, ll.lng), Math.max(maxLat, ll.lat), Math.max(maxLng, ll.lng));
            }
        };
    }
    function boundsFromLatLngs(latlngs) {
        if (!latlngs.length) return makeBounds(0, 0, 0, 0);
        var minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
        latlngs.forEach(function (ll) {
            minLat = Math.min(minLat, ll.lat); maxLat = Math.max(maxLat, ll.lat);
            minLng = Math.min(minLng, ll.lng); maxLng = Math.max(maxLng, ll.lng);
        });
        return makeBounds(minLat, minLng, maxLat, maxLng);
    }

    // ── icon → DOM element ──────────────────────────────────────────────
    var DEFAULT_SIZE = [25, 41];
    var DEFAULT_ANCHOR = [12, 41];

    function defaultPinElement(color) {
        var el = document.createElement('div');
        el.style.width = DEFAULT_SIZE[0] + 'px';
        el.style.height = DEFAULT_SIZE[1] + 'px';
        el.innerHTML =
            '<svg width="' + DEFAULT_SIZE[0] + '" height="' + DEFAULT_SIZE[1] + '" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="' + (color || '#2A81CB') + '"/>' +
            '<circle cx="12.5" cy="12.5" r="5.5" fill="#fff"/></svg>';
        return el;
    }

    function buildIconElement(iconDef) {
        var el;
        var size = (iconDef && iconDef.iconSize) || DEFAULT_SIZE;
        var anchor = (iconDef && iconDef.iconAnchor) || DEFAULT_ANCHOR;
        if (iconDef && iconDef._shimType === 'divIcon') {
            el = document.createElement('div');
            if (iconDef.className) el.className = iconDef.className;
            el.innerHTML = iconDef.html || '';
            el.style.width = size[0] + 'px';
            el.style.height = size[1] + 'px';
        } else if (iconDef && iconDef._shimType === 'icon') {
            el = document.createElement('img');
            el.src = iconDef.iconUrl;
            el.style.width = size[0] + 'px';
            el.style.height = size[1] + 'px';
            el.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,.4))';
        } else {
            el = defaultPinElement(iconDef && iconDef.color);
        }
        el.style.cursor = 'pointer';
        el._shimOffset = [size[0] / 2 - anchor[0], size[1] / 2 - anchor[1]];
        return el;
    }

    // ── Marker ───────────────────────────────────────────────────────────
    function ShimMarker(latlng, opts) {
        opts = opts || {};
        this._latlng = normalizeLatLng(latlng);
        this._opts = opts;
        this._listeners = {};
        this._element = buildIconElement(opts.icon);
        this._mlMarker = new maplibregl.Marker({
            element: this._element,
            anchor: 'center',
            offset: this._element._shimOffset,
            draggable: !!opts.draggable
        }).setLngLat(toLngLatArr(this._latlng));

        var self = this;
        this._element.addEventListener('click', function (ev) {
            ev.stopPropagation();
            if (self._popup && !self._popup.isOpen()) self._mlMarker.togglePopup();
            self._fire('click', { originalEvent: ev, latlng: self._latlng, target: self });
        });
        this._mlMarker.on('dragend', function () {
            var ll = self._mlMarker.getLngLat();
            self._latlng = { lat: ll.lat, lng: ll.lng };
            self._fire('dragend', { target: self });
        });
    }
    ShimMarker.prototype.addTo = function (map) {
        this._map = underlyingMap(map);
        this._mlMarker.addTo(this._map);
        return this;
    };
    ShimMarker.prototype.remove = function () { this._mlMarker.remove(); return this; };
    ShimMarker.prototype.bindPopup = function (content, popupOpts) {
        var offset = this._element._shimOffset || [0, 0];
        this._popup = new maplibregl.Popup(Object.assign({ offset: [offset[0], offset[1] - 20] }, popupOpts || {}));
        if (typeof content === 'string') this._popup.setHTML(content);
        else this._popup.setDOMContent(content);
        this._mlMarker.setPopup(this._popup);
        return this;
    };
    ShimMarker.prototype.openPopup = function () {
        if (this._popup && !this._popup.isOpen()) this._mlMarker.togglePopup();
        return this;
    };
    ShimMarker.prototype.closePopup = function () {
        if (this._popup && this._popup.isOpen()) this._mlMarker.togglePopup();
        return this;
    };
    ShimMarker.prototype.setLatLng = function (latlng) {
        this._latlng = normalizeLatLng(latlng);
        this._mlMarker.setLngLat(toLngLatArr(this._latlng));
        return this;
    };
    ShimMarker.prototype.getLatLng = function () { return this._latlng; };
    ShimMarker.prototype.setIcon = function (iconDef) {
        var newEl = buildIconElement(iconDef);
        this._element.replaceWith ? this._element.replaceWith(newEl) : null;
        this._element = newEl;
        this._mlMarker.remove();
        this._mlMarker = new maplibregl.Marker({ element: newEl, anchor: 'center', offset: newEl._shimOffset, draggable: !!this._opts.draggable })
            .setLngLat(toLngLatArr(this._latlng));
        if (this._map) this._mlMarker.addTo(this._map);
        return this;
    };
    ShimMarker.prototype.on = function (evt, cb) {
        (this._listeners[evt] = this._listeners[evt] || []).push(cb);
        return this;
    };
    ShimMarker.prototype.off = function (evt, cb) {
        if (!this._listeners[evt]) return this;
        this._listeners[evt] = cb ? this._listeners[evt].filter(function (f) { return f !== cb; }) : [];
        return this;
    };
    ShimMarker.prototype._fire = function (evt, payload) {
        (this._listeners[evt] || []).forEach(function (cb) { cb(payload); });
    };

    // ── circleMarker (rendered as a divIcon-backed marker, screen-px radius) ──
    function circleElement(opts) {
        opts = opts || {};
        var d = (opts.radius || 10) * 2;
        var el = document.createElement('div');
        el.style.width = d + 'px';
        el.style.height = d + 'px';
        el.style.borderRadius = '50%';
        el.style.background = opts.fillColor || opts.color || '#3388ff';
        el.style.opacity = opts.fillOpacity != null ? opts.fillOpacity : 0.75;
        el.style.border = (opts.weight != null ? opts.weight : 2) + 'px solid ' + (opts.color || '#3388ff');
        el.style.boxSizing = 'border-box';
        return el;
    }
    function ShimCircleMarker(latlng, opts) {
        this._latlng = normalizeLatLng(latlng);
        this._opts = opts || {};
        this._listeners = {};
        this._element = circleElement(this._opts);
        this._element.style.cursor = 'pointer';
        this._mlMarker = new maplibregl.Marker({ element: this._element, anchor: 'center', offset: [0, 0], draggable: false })
            .setLngLat(toLngLatArr(this._latlng));
        var self = this;
        this._element.addEventListener('click', function (ev) {
            ev.stopPropagation();
            if (self._popup && !self._popup.isOpen()) self._mlMarker.togglePopup();
            self._fire('click', { originalEvent: ev, latlng: self._latlng, target: self });
        });
    }
    ShimCircleMarker.prototype = Object.create(ShimMarker.prototype);

    // ── standalone popup (L.popup().setLatLng().setContent().openOn(map)) ──
    function ShimStandalonePopup(opts) { this._popup = new maplibregl.Popup(opts || {}); }
    ShimStandalonePopup.prototype.setLatLng = function (latlng) { this._popup.setLngLat(toLngLatArr(latlng)); return this; };
    ShimStandalonePopup.prototype.setContent = function (html) {
        if (typeof html === 'string') this._popup.setHTML(html); else this._popup.setDOMContent(html);
        return this;
    };
    ShimStandalonePopup.prototype.openOn = function (map) { this._popup.addTo(underlyingMap(map)); return this; };
    ShimStandalonePopup.prototype.addTo = function (map) { return this.openOn(map); };
    ShimStandalonePopup.prototype.remove = function () { this._popup.remove(); return this; };

    // ── GeoJSON line layer (polyline + routing route line share this) ──
    function addOrUpdateLine(map, id, coordsLngLat, style) {
        var data = { type: 'Feature', geometry: { type: 'LineString', coordinates: coordsLngLat }, properties: {} };
        var run = function () {
            if (map.getSource(id)) { map.getSource(id).setData(data); return; }
            map.addSource(id, { type: 'geojson', data: data });
            map.addLayer({
                id: id, type: 'line', source: id,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': (style && style.color) || '#3388ff',
                    'line-width': (style && style.weight) || 3,
                    'line-opacity': (style && style.opacity != null) ? style.opacity : 1
                }
            });
        };
        if (map.isStyleLoaded && map.isStyleLoaded()) run(); else map.once('load', run);
    }
    function removeLine(map, id) {
        if (!map) return;
        if (map.getLayer && map.getLayer(id)) map.removeLayer(id);
        if (map.getSource && map.getSource(id)) map.removeSource(id);
    }

    function ShimPolyline(latlngs, opts) {
        this._latlngs = latlngs.map(normalizeLatLng);
        this._opts = opts || {};
        this._id = 'shim-line-' + (++counter);
    }
    ShimPolyline.prototype.addTo = function (map) {
        this._map = underlyingMap(map);
        addOrUpdateLine(this._map, this._id, this._latlngs.map(function (ll) { return [ll.lng, ll.lat]; }), this._opts);
        return this;
    };
    ShimPolyline.prototype.remove = function () { removeLine(this._map, this._id); return this; };

    // ── L.featureGroup(markers).getBounds() ──
    function ShimFeatureGroup(layers) { this._layers = layers || []; }
    ShimFeatureGroup.prototype.getBounds = function () {
        var latlngs = this._layers.map(function (l) { return l.getLatLng ? l.getLatLng() : null; }).filter(Boolean);
        return boundsFromLatLngs(latlngs);
    };

    // ── Routing (mimics leaflet-routing-machine's L.Routing.control, OSRM-backed) ──
    function RoutingControl(opts) {
        this._opts = opts || {};
        this._listeners = {};
        this._id = 'shim-route-' + (++counter);
    }
    RoutingControl.prototype.on = function (evt, cb) {
        (this._listeners[evt] = this._listeners[evt] || []).push(cb);
        return this;
    };
    RoutingControl.prototype._fire = function (evt, payload) {
        (this._listeners[evt] || []).forEach(function (cb) { cb(payload); });
    };
    RoutingControl.prototype.addTo = function (map) {
        this._map = underlyingMap(map);
        this._run();
        return this;
    };
    RoutingControl.prototype._run = function () {
        var self = this;
        var wps = (this._opts.waypoints || []).map(normalizeLatLng);
        if (wps.length < 2) return;
        var coordStr = wps.map(function (w) { return w.lng + ',' + w.lat; }).join(';');
        var url = 'https://router.project-osrm.org/route/v1/driving/' + coordStr + '?overview=full&geometries=geojson&steps=true';
        fetch(url).then(function (r) { return r.json(); }).then(function (data) {
            if (!data.routes || !data.routes.length) { console.error('Routing: no route found'); return; }
            var route = data.routes[0];
            var style = (self._opts.lineOptions && self._opts.lineOptions.styles && self._opts.lineOptions.styles[0]) || {};
            addOrUpdateLine(self._map, self._id, route.geometry.coordinates, style);

            if (self._opts.fitSelectedRoutes !== false) {
                var coords = route.geometry.coordinates;
                var minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
                coords.forEach(function (c) {
                    minLng = Math.min(minLng, c[0]); maxLng = Math.max(maxLng, c[0]);
                    minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
                });
                self._map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60 });
            }
            self._buildContainer(route);
            self._fire('routesfound', {
                routes: [{
                    summary: { totalDistance: route.distance, totalTime: route.duration },
                    coordinates: route.geometry.coordinates
                }]
            });
        }).catch(function (err) {
            console.error('Routing fetch failed:', err);
            self._fire('routingerror', { error: err });
        });
    };
    RoutingControl.prototype._buildContainer = function (route) {
        var mapEl = this._map.getContainer();
        var container = document.createElement('div');
        container.className = 'leaflet-routing-container';
        container.style.cssText = 'position:absolute;top:10px;right:10px;background:#1f2937;color:#fff;' +
            'padding:12px 16px;border-radius:8px;font-size:13px;max-width:260px;z-index:5;box-shadow:0 2px 8px rgba(0,0,0,.3);';
        var km = (route.distance / 1000).toFixed(2);
        var min = Math.round(route.duration / 60);
        container.innerHTML = '<div style="font-weight:600;margin-bottom:4px;">🚗 Rota</div><div>' + km + ' km · ' + min + ' min</div>';
        mapEl.appendChild(container);
        this._container = container;
    };
    RoutingControl.prototype.remove = function () {
        if (this._container && this._container.parentNode) this._container.parentNode.removeChild(this._container);
        removeLine(this._map, this._id);
        return this;
    };

    // ── Map ──────────────────────────────────────────────────────────────
    function ShimMap(idOrEl, opts) {
        opts = opts || {};
        var container = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
        var center = opts.center ? normalizeLatLng(opts.center) : { lat: 0, lng: 0 };
        this._maplibreMap = new maplibregl.Map({
            container: container,
            style: STYLE_URL,
            center: [center.lng, center.lat],
            zoom: opts.zoom != null ? opts.zoom : 2,
            attributionControl: false
        });
        this._maplibreMap.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }));
        if (opts.zoomControl !== false) {
            this._maplibreMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        }
        if (opts.scrollWheelZoom === false) this._maplibreMap.scrollZoom.disable();
        if (opts.dragging === false) this._maplibreMap.dragPan.disable();
        this._clickWrappers = new Map();
    }
    ShimMap.prototype.setView = function (latlng, zoom) {
        var ll = normalizeLatLng(latlng);
        this._maplibreMap.jumpTo({ center: [ll.lng, ll.lat], zoom: zoom != null ? zoom : this._maplibreMap.getZoom() });
        return this;
    };
    ShimMap.prototype.flyTo = function (latlng, zoom) {
        var ll = normalizeLatLng(latlng);
        this._maplibreMap.flyTo({ center: [ll.lng, ll.lat], zoom: zoom });
        return this;
    };
    ShimMap.prototype.panTo = ShimMap.prototype.flyTo;
    ShimMap.prototype.invalidateSize = function () { this._maplibreMap.resize(); return this; };
    ShimMap.prototype.addLayer = function (layer) { if (layer && layer.addTo) layer.addTo(this); return this; };
    ShimMap.prototype.removeLayer = function (layer) { if (layer && layer.remove) layer.remove(); return this; };
    ShimMap.prototype.removeControl = function (control) { if (control && control.remove) control.remove(); return this; };
    ShimMap.prototype.fitBounds = function (bounds, fitOpts) {
        var b = bounds;
        if (b && b._sw && b._ne) {
            this._maplibreMap.fitBounds([[b._sw.lng, b._sw.lat], [b._ne.lng, b._ne.lat]], fitOpts);
        } else if (Array.isArray(b)) {
            var lngLats = b.map(function (p) { return Array.isArray(p) ? [p[1], p[0]] : [p.lng, p.lat]; });
            this._maplibreMap.fitBounds(maplibregl.LngLatBounds.convert(lngLats), fitOpts);
        }
        return this;
    };
    ShimMap.prototype.getBounds = function () {
        var b = this._maplibreMap.getBounds();
        return makeBounds(b.getSouth(), b.getWest(), b.getNorth(), b.getEast());
    };
    ShimMap.prototype.on = function (evt, a, b) {
        if (typeof a === 'function' && b === undefined) {
            var cb = a;
            var isPointerEvt = (evt === 'click' || evt === 'dblclick' || evt === 'contextmenu' || evt === 'mousemove');
            var wrapped = isPointerEvt ? function (e) {
                cb({ originalEvent: e.originalEvent, latlng: { lat: e.lngLat.lat, lng: e.lngLat.lng } });
            } : cb;
            this._clickWrappers.set(cb, wrapped);
            this._maplibreMap.on(evt, wrapped);
        } else {
            this._maplibreMap.on(evt, a, b);
        }
        return this;
    };
    ShimMap.prototype.off = function (evt, cb) {
        var wrapped = this._clickWrappers.get(cb) || cb;
        this._maplibreMap.off(evt, wrapped);
        return this;
    };
    ShimMap.prototype.once = function (evt, cb) { this._maplibreMap.once(evt, cb); return this; };
    ShimMap.prototype.addControl = function (c, pos) { this._maplibreMap.addControl(c, pos); return this; };
    ShimMap.prototype.getContainer = function () { return this._maplibreMap.getContainer(); };
    ShimMap.prototype.remove = function () { this._maplibreMap.remove(); return this; };

    // ── public L namespace ──────────────────────────────────────────────
    var L = {
        map: function (id, opts) { return new ShimMap(id, opts); },
        tileLayer: function () {
            // No-op: OpenFreeMap tiles are already baked into the map style.
            return { addTo: function () { return this; }, remove: function () {} };
        },
        marker: function (latlng, opts) { return new ShimMarker(latlng, opts); },
        circleMarker: function (latlng, opts) { return new ShimCircleMarker(latlng, opts); },
        circle: function (latlng, opts) { return new ShimCircleMarker(latlng, opts); },
        polyline: function (latlngs, opts) { return new ShimPolyline(latlngs, opts); },
        icon: function (opts) { return Object.assign({ _shimType: 'icon' }, opts); },
        divIcon: function (opts) { return Object.assign({ _shimType: 'divIcon' }, opts); },
        popup: function (opts) { return new ShimStandalonePopup(opts); },
        latLng: function (lat, lng) {
            if (lat != null && typeof lat === 'object') return normalizeLatLng(lat);
            return { lat: lat, lng: lng };
        },
        // called as `new L.featureGroup(...)` in this codebase — returning an
        // object from a `new`-invoked function makes JS use that object, so
        // this doubles as a plain factory too.
        featureGroup: function (layers) { return new ShimFeatureGroup(layers); },
        Routing: { control: function (opts) { return new RoutingControl(opts); } }
    };

    global.L = L;
})(window);
