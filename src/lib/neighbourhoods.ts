export interface Neighbourhood {
  name: string;
  lat: number;
  lng: number;
  radius: number; // meters
}

export const NEIGHBOURHOODS: Record<string, Neighbourhood[]> = {
  Roma: [
    // 20+ Rome neighbourhoods with realistic lat/lng and radius 400-900m
    { name: "Centro Storico", lat: 41.8966, lng: 12.4822, radius: 600 },
    { name: "Trastevere", lat: 41.8883, lng: 12.4685, radius: 500 },
    { name: "Prati", lat: 41.9064, lng: 12.4613, radius: 600 },
    { name: "Testaccio", lat: 41.8787, lng: 12.4727, radius: 500 },
    { name: "Esquilino", lat: 41.8964, lng: 12.5089, radius: 500 },
    { name: "Termini", lat: 41.9004, lng: 12.5024, radius: 500 },
    { name: "Monti", lat: 41.8958, lng: 12.4973, radius: 400 },
    { name: "Nomentano", lat: 41.9118, lng: 12.5222, radius: 700 },
    { name: "Parioli", lat: 41.9219, lng: 12.4963, radius: 700 },
    { name: "Flaminio", lat: 41.9205, lng: 12.4742, radius: 600 },
    { name: "Ostiense", lat: 41.8638, lng: 12.4795, radius: 700 },
    { name: "Tiburtino", lat: 41.8997, lng: 12.5445, radius: 800 },
    { name: "Prenestino", lat: 41.8867, lng: 12.5361, radius: 800 },
    { name: "Pigneto", lat: 41.8867, lng: 12.5229, radius: 500 },
    { name: "San Giovanni", lat: 41.8802, lng: 12.5101, radius: 600 },
    { name: "Celio", lat: 41.8882, lng: 12.4982, radius: 400 },
    { name: "Trionfale", lat: 41.9156, lng: 12.4438, radius: 700 },
    { name: "Aurelio", lat: 41.8963, lng: 12.4362, radius: 700 },
    { name: "EUR", lat: 41.8274, lng: 12.4669, radius: 900 },
    { name: "Portuense", lat: 41.8567, lng: 12.4457, radius: 700 },
    { name: "Gianicolense", lat: 41.8742, lng: 12.4441, radius: 700 },
    { name: "Trieste", lat: 41.9210, lng: 12.5172, radius: 700 },
    { name: "Salario", lat: 41.9230, lng: 12.5188, radius: 600 },
  ],
  Milano: [
    { name: "Centro", lat: 45.4641, lng: 9.1919, radius: 700 },
    { name: "Brera", lat: 45.4740, lng: 9.1870, radius: 400 },
    { name: "Navigli", lat: 45.4519, lng: 9.1767, radius: 600 },
    { name: "Porta Venezia", lat: 45.4739, lng: 9.2064, radius: 600 },
    { name: "Isola", lat: 45.4883, lng: 9.1901, radius: 500 },
    { name: "Loreto", lat: 45.4792, lng: 9.2183, radius: 600 },
    { name: "Porta Romana", lat: 45.4531, lng: 9.1961, radius: 600 },
    { name: "Sempione", lat: 45.4792, lng: 9.1714, radius: 600 },
    { name: "San Siro", lat: 45.4783, lng: 9.1268, radius: 700 },
    { name: "Lambrate", lat: 45.4786, lng: 9.2482, radius: 600 },
    { name: "Bovisa", lat: 45.5048, lng: 9.1638, radius: 500 },
    { name: "Bicocca", lat: 45.5151, lng: 9.2107, radius: 700 },
    { name: "Niguarda", lat: 45.5190, lng: 9.1965, radius: 700 },
    { name: "Lorenteggio", lat: 45.4468, lng: 9.1532, radius: 800 },
    { name: "Vigentino", lat: 45.4342, lng: 9.1984, radius: 700 },
    { name: "QT8", lat: 45.4865, lng: 9.1362, radius: 600 },
    { name: "Dergano", lat: 45.4989, lng: 9.1688, radius: 600 },
    { name: "Affori", lat: 45.5150, lng: 9.1672, radius: 600 },
  ],
  Napoli: [
    { name: "Centro Storico", lat: 40.8518, lng: 14.2681, radius: 700 },
    { name: "Chiaia", lat: 40.8378, lng: 14.2445, radius: 600 },
    { name: "Vomero", lat: 40.8511, lng: 14.2432, radius: 700 },
    { name: "Fuorigrotta", lat: 40.8275, lng: 14.2049, radius: 700 },
    { name: "Scampia", lat: 40.9016, lng: 14.2374, radius: 900 },
    { name: "Secondigliano", lat: 40.9016, lng: 14.2705, radius: 700 },
    { name: "Barra", lat: 40.8355, lng: 14.3263, radius: 600 },
    { name: "Ponticelli", lat: 40.8501, lng: 14.3352, radius: 700 },
    { name: "Soccavo", lat: 40.8546, lng: 14.1941, radius: 700 },
    { name: "Posillipo", lat: 40.8113, lng: 14.2244, radius: 800 },
    { name: "Quartieri Spagnoli", lat: 40.8448, lng: 14.2524, radius: 400 },
    { name: "Arenella", lat: 40.8604, lng: 14.2448, radius: 500 },
    { name: "Miano", lat: 40.8863, lng: 14.2544, radius: 600 },
    { name: "Bagnoli", lat: 40.8052, lng: 14.1754, radius: 800 },
    { name: "San Giovanni a Teduccio", lat: 40.8353, lng: 14.3041, radius: 600 },
  ],
  Torino: [
    { name: "Centro", lat: 45.0700, lng: 7.6869, radius: 700 },
    { name: "Crocetta", lat: 45.0573, lng: 7.6719, radius: 600 },
    { name: "San Salvario", lat: 45.0583, lng: 7.6869, radius: 600 },
    { name: "Vanchiglia", lat: 45.0771, lng: 7.7000, radius: 500 },
    { name: "Aurora", lat: 45.0840, lng: 7.6920, radius: 600 },
    { name: "Barriera di Milano", lat: 45.0950, lng: 7.6960, radius: 700 },
    { name: "Mirafiori", lat: 45.0195, lng: 7.6551, radius: 900 },
    { name: "Lingotto", lat: 45.0289, lng: 7.6840, radius: 700 },
    { name: "Santa Rita", lat: 45.0497, lng: 7.6696, radius: 700 },
    { name: "Borgo Vittoria", lat: 45.0820, lng: 7.6713, radius: 600 },
    { name: "Pozzo Strada", lat: 45.0680, lng: 7.6450, radius: 600 },
    { name: "Madonna di Campagna", lat: 45.0919, lng: 7.6599, radius: 700 },
  ],
  Firenze: [
    { name: "Centro Storico", lat: 43.7696, lng: 11.2558, radius: 600 },
    { name: "Oltrarno", lat: 43.7634, lng: 11.2479, radius: 500 },
    { name: "San Frediano", lat: 43.7700, lng: 11.2385, radius: 400 },
    { name: "Campo di Marte", lat: 43.7866, lng: 11.2801, radius: 700 },
    { name: "Novoli", lat: 43.7951, lng: 11.2292, radius: 700 },
    { name: "Rifredi", lat: 43.8020, lng: 11.2332, radius: 700 },
    { name: "Gavinana", lat: 43.7531, lng: 11.2636, radius: 700 },
    { name: "Isolotto", lat: 43.7617, lng: 11.2227, radius: 700 },
  ],
  Bologna: [
    { name: "Centro Storico", lat: 44.4949, lng: 11.3426, radius: 700 },
    { name: "Bolognina", lat: 44.5100, lng: 11.3426, radius: 700 },
    { name: "San Vitale", lat: 44.5040, lng: 11.3600, radius: 700 },
    { name: "Porto-Saragozza", lat: 44.4880, lng: 11.3200, radius: 700 },
    { name: "Savena", lat: 44.4860, lng: 11.3700, radius: 800 },
    { name: "Navile", lat: 44.5211, lng: 11.3323, radius: 900 },
    { name: "Reno", lat: 44.4783, lng: 11.3059, radius: 800 },
  ],
};

export function getNeighbourhoods(cityName: string): Neighbourhood[] {
  // Fuzzy match: "Roma" matches "Roma", "Milano" matches "Milano" etc.
  const key = Object.keys(NEIGHBOURHOODS).find(k =>
    cityName.toLowerCase().startsWith(k.toLowerCase()) ||
    k.toLowerCase().startsWith(cityName.toLowerCase().split(" ")[0])
  );
  return key ? NEIGHBOURHOODS[key] : [];
}
