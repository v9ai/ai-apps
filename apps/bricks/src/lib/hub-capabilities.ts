import type { HubType } from "@/lib/parser";

export interface CapabilityMethod {
  signature: string;
  descEn: string;
  descRo: string;
}

export interface CapabilityGroup {
  id: string;
  titleEn: string;
  titleRo: string;
  descEn: string;
  descRo: string;
  methods: CapabilityMethod[];
}

const SHARED_CAPABILITIES: CapabilityGroup[] = [
  {
    id: "light",
    titleEn: "Status light",
    titleRo: "Lumina de stare",
    descEn: "Control the hub's built-in status light to show colors, blink patterns, or animations.",
    descRo: "Controlează LED-ul de stare al hub-ului pentru a afișa culori, secvențe de clipire sau animații.",
    methods: [
      {
        signature: "light.on(color)",
        descEn: "Turns on the light at the specified color.",
        descRo: "Aprinde lumina cu culoarea specificată.",
      },
      {
        signature: "light.off()",
        descEn: "Turns off the light.",
        descRo: "Stinge lumina.",
      },
      {
        signature: "light.blink(color, durations)",
        descEn: "Blinks the light at a given color following an on/off duration sequence. Keeps blinking while the rest of your program runs.",
        descRo: "Face lumina să clipească cu o culoare dată, după o secvență de durate aprins/stins. Clipirea continuă în paralel cu restul programului.",
      },
      {
        signature: "light.animate(colors, interval)",
        descEn: "Animates the light through a sequence of colors, each shown for the given interval. Loops in the background.",
        descRo: "Animă lumina printr-o secvență de culori, fiecare afișată pe intervalul dat. Se reia automat în fundal.",
      },
    ],
  },
  {
    id: "ble",
    titleEn: "Bluetooth messaging",
    titleRo: "Mesagerie Bluetooth",
    descEn: "Connectionless broadcasting between hubs — send and receive small payloads without pairing.",
    descRo: "Comunicare Bluetooth fără conexiune între hub-uri — trimite și primește pachete mici de date, fără pairing.",
    methods: [
      {
        signature: "ble.broadcast(data)",
        descEn: "Broadcasts the given value (int, float, str, bytes, bool, list, or tuple) on the channel chosen at hub init. Up to 26 bytes total. Pass None to stop.",
        descRo: "Difuzează valoarea dată (int, float, str, bytes, bool, listă sau tuplă) pe canalul ales la inițializarea hub-ului. Maxim 26 octeți. Trimite None pentru a opri difuzarea.",
      },
      {
        signature: "ble.observe(channel)",
        descEn: "Returns the most recently observed value on a channel (0–255), in the same shape it was sent. Returns None if no recent data is available.",
        descRo: "Întoarce ultima valoare observată pe un canal (0–255), în aceeași formă în care a fost trimisă. Întoarce None dacă nu există date recente.",
      },
      {
        signature: "ble.signal_strength(channel)",
        descEn: "Returns the average RSSI in dBm for that channel (≈ -40 dBm near, -70 dBm far). Returns -128 if no recent data.",
        descRo: "Întoarce puterea medie a semnalului în dBm pentru canal (≈ -40 dBm aproape, -70 dBm departe). Întoarce -128 dacă nu există date recente.",
      },
      {
        signature: "ble.version()",
        descEn: "Returns the firmware version string of the Bluetooth chip.",
        descRo: "Întoarce versiunea de firmware a cipului Bluetooth.",
      },
    ],
  },
  {
    id: "battery",
    titleEn: "Battery",
    titleRo: "Baterie",
    descEn: "Monitor the hub's power supply for voltage and current draw.",
    descRo: "Monitorizează alimentarea hub-ului — tensiunea și curentul consumat.",
    methods: [
      {
        signature: "battery.voltage()",
        descEn: "Returns the battery voltage in millivolts.",
        descRo: "Întoarce tensiunea bateriei, în milivolți.",
      },
      {
        signature: "battery.current()",
        descEn: "Returns the current drawn from the battery in milliamps.",
        descRo: "Întoarce curentul consumat de la baterie, în miliamperi.",
      },
    ],
  },
  {
    id: "buttons",
    titleEn: "Buttons",
    titleRo: "Butoane",
    descEn: "Read which physical buttons on the hub are currently pressed.",
    descRo: "Citește ce butoane fizice de pe hub sunt apăsate în acel moment.",
    methods: [
      {
        signature: "buttons.pressed()",
        descEn: "Returns the set of currently pressed buttons.",
        descRo: "Întoarce mulțimea butoanelor apăsate în acest moment.",
      },
    ],
  },
  {
    id: "system",
    titleEn: "System",
    titleRo: "Sistem",
    descEn: "Inspect hub state, configure the stop button, persist data across runs, and shut down.",
    descRo: "Inspectează starea hub-ului, configurează butonul de oprire, salvează date între execuții și oprește hub-ul.",
    methods: [
      {
        signature: "system.info()",
        descEn: "Returns a dict with name, reset_reason, host_connected_ble, and program_start_type.",
        descRo: "Întoarce un dict cu name, reset_reason, host_connected_ble și program_start_type.",
      },
      {
        signature: "system.set_stop_button(button)",
        descEn: "Changes (or disables, with None) the button combination that stops the running program. Default is the center button.",
        descRo: "Schimbă (sau dezactivează, cu None) combinația de butoane care oprește programul. Implicit e butonul central.",
      },
      {
        signature: "system.storage(offset, read=…)",
        descEn: "Reads bytes from persistent user storage at an offset. Survives reboots; cleared on firmware update. Up to 128 bytes on this hub.",
        descRo: "Citește octeți din memoria persistentă a utilizatorului, începând cu un offset. Datele rezistă la reporniri; se șterg la actualizarea firmware-ului. Maxim 128 octeți pe acest hub.",
      },
      {
        signature: "system.storage(offset, write=…)",
        descEn: "Writes bytes to persistent user storage. Saved to flash on a normal power-off; not saved if batteries are pulled.",
        descRo: "Scrie octeți în memoria persistentă. Se salvează în flash la oprirea normală; nu se salvează dacă bateriile sunt scoase brusc.",
      },
      {
        signature: "system.reset_storage()",
        descEn: "Resets all user settings to defaults and erases user programs.",
        descRo: "Resetează toate setările utilizatorului la valorile implicite și șterge programele.",
      },
      {
        signature: "system.shutdown()",
        descEn: "Stops the program and powers the hub off.",
        descRo: "Oprește programul și închide hub-ul.",
      },
    ],
  },
];

export const HUB_CAPABILITIES: Record<HubType, CapabilityGroup[]> = {
  CityHub: SHARED_CAPABILITIES,
  TechnicHub: SHARED_CAPABILITIES,
  MoveHub: SHARED_CAPABILITIES,
  PrimeHub: SHARED_CAPABILITIES,
  EssentialHub: SHARED_CAPABILITIES,
};
