"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Factory } from "@/types/factory-type";
import L from "leaflet";
import "../../styles/factory-card.css";

// Geocoding using OpenStreetMap
const geocodeZip = async (zip: string, country: string): Promise<{ lat: number; lng: number } | null> => {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=${country}&format=json`
        );
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
    } catch (err) {
        console.error("Geocoding failed:", err);
        return null;
    }
};

interface FactoryMapProps {
    factories: Factory[] | null;
}

const MapAutoFit: React.FC<{ markers: { lat: number; lng: number }[] }> = ({ markers }) => {
    const map = useMap();

    useEffect(() => {
        if (markers.length === 0) return;

        const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
    }, [markers, map]);

    return null;
};

const FactoryMap: React.FC<FactoryMapProps> = ({ factories }) => {
    const [markerData, setMarkerData] = useState<
        { lat: number; lng: number; name: string; zip: string }[]
    >([]);

    useEffect(() => {
        const fetchCoordinates = async () => {
            const markers: { lat: number; lng: number; name: string; zip: string }[] = [];

            if (!factories) return;

            for (const factory of factories) {
                if (factory.zip && factory.country) {
                    const coords = await geocodeZip(factory.zip.toString(), factory.country);
                    if (coords) {
                        markers.push({
                            lat: coords.lat,
                            lng: coords.lng,
                            name: factory.factory_name || "Unnamed",
                            zip: factory.zip.toString(),
                        });
                    }
                }
            }

            setMarkerData(markers);
        };

        fetchCoordinates();
    }, [factories]);

    return (
        <div className="factory-map-container" style={{ height: "216px", width: "100%", padding: "16px" }}>
            <MapContainer
                center={[0, 0]} // Neutral center
                zoom={2}         // Low initial zoom
                scrollWheelZoom
                style={{
                    height: "100%",
                    width: "100%",
                    borderRadius: "20px",
                }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapAutoFit markers={markerData} />
                {markerData.map((marker, index) => (
                    <Marker
                        key={index}
                        position={[marker.lat, marker.lng]}
                        icon={L.divIcon({
                            className: "custom-marker-wrapper",
                            html: `<div class='custom-blue-marker'></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10],
                        })}
                    >
                        <Popup>
                            <strong>{marker.name}</strong>
                            <br />
                            ZIP: {marker.zip}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default FactoryMap;
