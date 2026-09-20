'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Layers, Search, SlidersHorizontal, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import { fetchProjects, fetchGeojson, ApiProject, GeoJsonFeatureCollection } from '../../lib/apiClient';

type GoogleMap = any;
type GoogleMarker = any;

function loadGoogleMaps(apiKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.google?.maps) return resolve(w.google.maps);
    const existing = document.querySelector('script[data-geomatrix-google-maps="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(w.google.maps));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.geomatrixGoogleMaps = 'true';
    script.onload = () => (w.google?.maps ? resolve(w.google.maps) : reject(new Error('Google Maps API did not initialize')));
    script.onerror = () => reject(new Error('Unable to load Google Maps'));
    document.head.appendChild(script);
  });
}

const STATE_CENTER_COORDS: Record<string, [number, number]> = {
  'andhra pradesh': [15.9129, 79.7400],
  'telangana': [18.1124, 79.0193],
  'odisha': [20.9517, 85.0985],
  'bihar': [25.0961, 85.3131],
  'punjab': [31.1471, 75.3412],
  'delhi': [28.7041, 77.1025],
  'gujarat': [22.2587, 71.1924],
  'karnataka': [15.3173, 75.7139],
  'west bengal': [22.9868, 87.8550],
  'maharashtra': [19.7515, 75.7139],
  'chhattisgarh': [21.2787, 81.8661],
  'uttarakhand': [30.0668, 79.0193],
};

function getRiskColor(level?: string, score?: number): string {
  const lvl = (level || '').toLowerCase();
  if (lvl === 'critical' || (score ?? 0) >= 75) return '#dc2626';
  if (lvl === 'high' || (score ?? 0) >= 50) return '#ea580c';
  if (lvl === 'medium' || (score ?? 0) >= 25) return '#ca8a04';
  return '#16a34a';
}

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap>(null);
  const markersRef = useRef<GoogleMarker[]>([]);

  const [dbProjects, setDbProjects] = useState<ApiProject[]>([]);
  const [geoFeatures, setGeoFeatures] = useState<GeoJsonFeatureCollection['features']>([]);
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');

  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load real projects & geojson from FastAPI backend
  useEffect(() => {
    async function loadData() {
      try {
        const [projList, geoData] = await Promise.all([
          fetchProjects(),
          fetchGeojson(),
        ]);
        setDbProjects(projList);
        setGeoFeatures(geoData?.features || []);
      } catch (err) {
        console.error('Failed to load map data from backend:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Initialize Google Maps if API key is present
  useEffect(() => {
    let cancelled = false;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    async function initGoogleMap() {
      if (!mapContainerRef.current || mapRef.current || !apiKey) {
        setMapFailed(true);
        return;
      }
      try {
        const googleMaps = await loadGoogleMaps(apiKey);
        if (cancelled || !mapContainerRef.current) return;

        const map = new googleMaps.Map(mapContainerRef.current, {
          center: { lat: 21.0, lng: 79.0 },
          zoom: 5,
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        mapRef.current = map;
        setMapReady(true);
      } catch {
        if (!cancelled) setMapFailed(true);
      }
    }

    initGoogleMap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Update Google Maps markers when projects/filters change
  useEffect(() => {
    const g = (typeof window !== 'undefined' ? window as any : {})?.google;
    if (!mapRef.current || !g?.maps) return;
    const googleMaps = g.maps;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap?.(null));
    markersRef.current = [];

    const filtered = dbProjects.filter((p) => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.project_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchState = stateFilter === 'All' || p.state === stateFilter;
      const matchRisk = riskFilter === 'All' || (p.risk_level || 'Low').toLowerCase() === riskFilter.toLowerCase();
      return matchSearch && matchState && matchRisk;
    });

    markersRef.current = filtered.map((p, idx) => {
      let lat = p.latitude;
      let lng = p.longitude;
      if (!lat || !lng || lat === 0) {
        const st = (p.state || '').toLowerCase();
        const coords = STATE_CENTER_COORDS[st] || [20.5937, 78.9629];
        lat = coords[0] + ((idx % 5) - 2) * 0.12;
        lng = coords[1] + (Math.floor(idx / 5) % 5 - 2) * 0.12;
      }

      const color = getRiskColor(p.risk_level, p.risk_score);
      const marker = new googleMaps.Marker({
        map: mapRef.current,
        position: { lat, lng },
        title: p.name,
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => setSelectedProject(p));
      return marker;
    });
  }, [dbProjects, searchQuery, stateFilter, riskFilter, mapReady]);

  const filteredProjects = dbProjects.filter((p) => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.project_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchState = stateFilter === 'All' || p.state === stateFilter;
    const matchRisk = riskFilter === 'All' || (p.risk_level || 'Low').toLowerCase() === riskFilter.toLowerCase();
    return matchSearch && matchState && matchRisk;
  });

  const uniqueStates = Array.from(new Set(dbProjects.map((p) => p.state).filter(Boolean)));
  const criticalCount = filteredProjects.filter((p) => (p.risk_level || '').toLowerCase() === 'critical').length;
  const highCount = filteredProjects.filter((p) => (p.risk_level || '').toLowerCase() === 'high').length;
  const totalLand = filteredProjects.reduce((acc, p) => acc + (p.land_required || 0), 0);

  return (
    <div className="page">
      <div className="maplayout">
        <section className="mapbox" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Main Map Container */}
          <div ref={mapContainerRef} className="mapcanvas" style={{ width: '100%', height: '100%', minHeight: 520 }} />

          {/* Fallback Interactive Spatial Map when Google Maps API key is not present */}
          {(mapFailed || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#0f172a',
                color: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 10,
              }}
            >
              {/* Interactive Vector GIS Overlay */}
              <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} style={{ color: '#38bdf8' }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Spatial GIS Intelligence Grid</span>
                </div>
                <span className="badge" style={{ background: '#0284c7', color: '#fff', fontSize: 11 }}>
                  {filteredProjects.length} Projects Plotting Live
                </span>
              </div>

              {/* Vector GIS Map Container */}
              <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)', overflow: 'auto', padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {filteredProjects.map((p) => {
                    const color = getRiskColor(p.risk_level, p.risk_score);
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProject(p)}
                        style={{
                          background: selectedProject?.id === p.id ? '#1e293b' : '#0f172a',
                          border: `1.5px solid ${selectedProject?.id === p.id ? color : '#334155'}`,
                          borderRadius: 8,
                          padding: 14,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: selectedProject?.id === p.id ? `0 0 12px ${color}44` : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{p.project_code}</span>
                          <span style={{ fontSize: 10, background: `${color}22`, color, border: `1px solid ${color}44`, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                            {p.risk_level || 'Low'} ({p.risk_score ?? 0})
                          </span>
                        </div>
                        <h4 style={{ fontSize: 13, color: '#f8fafc', margin: '8px 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</h4>
                        <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {p.state} {p.district ? `· ${p.district}` : ''}
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                          <span>Land: <b>{p.land_required} ha</b></span>
                          <span>Stage: <b>{p.current_stage || 'Active'}</b></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Project Details Popup */}
          {selectedProject && (
            <div
              style={{
                position: 'absolute',
                left: 18,
                bottom: 18,
                width: 310,
                background: '#ffffff',
                border: '1px solid var(--line)',
                padding: 16,
                borderRadius: 8,
                boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                zIndex: 100,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="eyebrow">{selectedProject.project_code}</span>
                <button onClick={() => setSelectedProject(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }}>✕</button>
              </div>
              <h3 style={{ fontSize: 14, margin: '6px 0 4px 0', color: '#0f172a' }}>{selectedProject.name}</h3>
              <div className="sub" style={{ fontSize: 12, color: '#64748b' }}>
                {selectedProject.state} {selectedProject.district ? `· ${selectedProject.district}` : ''}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0', padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
                <span className={`risk ${(selectedProject.risk_level || 'low').toLowerCase()}`}>
                  {selectedProject.risk_level || 'Low'} ({selectedProject.risk_score ?? 0}/100)
                </span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{selectedProject.authority}</span>
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                <div>Land Required: <b>{selectedProject.land_required} ha</b></div>
                <div>Affected Families: <b>{selectedProject.affected_families}</b></div>
                {selectedProject.primary_driver && <div style={{ color: '#dc2626', marginTop: 4 }}>Driver: {selectedProject.primary_driver}</div>}
              </div>
              <Link className="btn primary" style={{ display: 'block', textAlign: 'center', width: '100%' }} href={`/projects/${selectedProject.id}`}>
                View Deep-Dive Risk Analysis ➔
              </Link>
            </div>
          )}

          <div style={{ position: 'absolute', left: 14, top: 14, zIndex: 90, background: '#fff', border: '1px solid var(--line)', borderRadius: 5, padding: '6px 10px', fontSize: 11, fontWeight: 600, boxShadow: '0 2px 8px #0001' }}>
            GIS Spatial Map ({filteredProjects.length} Projects Active)
          </div>
        </section>

        {/* Sidebar Controls & Summary */}
        <aside className="mapside">
          <div className="eyebrow">GIS Spatial Intelligence</div>
          <h2 style={{ fontSize: 20, margin: '5px 0' }}>Spatial Risk Overview</h2>

          <div className="search" style={{ maxWidth: 'none', margin: '14px 0' }}>
            <Search size={14} />
            <input
              placeholder="Search map projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mapmetric">
            <div>
              <div className="muted">Total Projects</div>
              <b>{filteredProjects.length}</b>
            </div>
            <div>
              <div className="muted">Critical</div>
              <b style={{ color: '#dc2626' }}>{criticalCount}</b>
            </div>
            <div>
              <div className="muted">High-Risk</div>
              <b style={{ color: '#ea580c' }}>{highCount}</b>
            </div>
            <div>
              <div className="muted">Affected Area</div>
              <b>{totalLand.toLocaleString()} ha</b>
            </div>
          </div>

          <div className="panel" style={{ padding: 12, marginTop: 14 }}>
            <div className="paneltitle">
              <SlidersHorizontal size={13} /> Map Filters
            </div>
            <div className="form" style={{ marginTop: 10 }}>
              <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                <option value="All">All States</option>
                {uniqueStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                <option value="All">All Risk Levels</option>
                <option value="Critical">Critical</option>
                <option value="High">High Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="Low">Low Risk</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="paneltitle">Risk Legend</div>
            <div className="legend" style={{ marginTop: 8 }}>
              <div className="legendrow">
                <span className="legenddot" style={{ background: '#dc2626' }} /> Critical Risk (Score &gt;= 75)
              </div>
              <div className="legendrow">
                <span className="legenddot" style={{ background: '#ea580c' }} /> High Risk (Score 50 - 74)
              </div>
              <div className="legendrow">
                <span className="legenddot" style={{ background: '#ca8a04' }} /> Medium Risk (Score 25 - 49)
              </div>
              <div className="legendrow">
                <span className="legenddot" style={{ background: '#16a34a' }} /> Low Risk (Score &lt; 25)
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
