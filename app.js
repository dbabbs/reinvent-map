const platform = new H.service.Platform({ apikey: "qHbGACVC8wUgzipkERYFIvbK8ASY9UhPsKSGTB7quRI" });
const defaultLayers = platform.createDefaultLayers();
const map = new H.Map(
   document.querySelector("#map"),
   defaultLayers.vector.normal.map,
   {
      center: { lat: 36.114647, lng: -115.172813 },
      zoom: 15,
      pixelRatio: window.devicePixelRatio || 1
   }
);
window.addEventListener("resize", () => map.getViewPort().resize());
new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

map.getViewModel().setLookAtData(
   {
      tilt: 45,
      heading: -150,
      zoom: 3
   },
   true
);

const style = new H.map.Style("./theme.yaml");
const provider = map.getBaseLayer().getProvider();
provider.setStyle(style);

const weekdays = [
   "Sunday",
   "Monday",
   "Tuesday",
   "Wednesday",
   "Thursday",
   "Friday",
   "Saturday"
];

(async () => {
   const casinos = await fetch("./data/casinos.json").then(res => res.json());
   const data = (await fetch("./data/output.json").then(res => res.json()))
      .features[0];
   const times = data.properties.coordTimes;

   const geometry = data.geometry.coordinates.map(x => ({
      lat: x[1],
      lng: x[0]
   }));

   await flyTo({
      position: geometry[0],
      heading: map.getViewModel().getLookAtData().heading,
      zoom: 16.5,
      duration: 10000,
      tilt: 45
   });

   const linestring = new H.geo.LineString();
   linestring.pushLatLngAlt(0, 0);
   linestring.pushLatLngAlt(1, 1);
   const routeLine = new H.map.Polyline(linestring, {
      volatility: true,
      style: { strokeColor: "#00AFAA", lineWidth: 3 }
   });
   map.addObject(routeLine);

   const smooth = [];
   const smoothTimes = [];
   const skip = 40;
   for (let i = 0; i < geometry.length; i += skip) {
      smooth.push(geometry[i]);
      smoothTimes.push(times[i]);
   }

   const ANIMATION_DURATION = 500;

   let curr = 2;
   const timer = setInterval(() => {
      if (curr >= smooth.length - 2) {
         clearInterval(timer);

         flyTo({
            position: { lat: 36.114647, lng: -115.172813 },
            heading: 180,
            zoom: 14.7,
            duration: 6000,
            tilt: 0
         });
         document.querySelector("#time").innerText = '10:03 AM';
         document.querySelector("#day").innerText = 'Thursday';

      } else {
         curr += 1;

         const dayOfWeek = new Date(smoothTimes[curr]).getDay();
         const time = new Date(smoothTimes[curr])
            .toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles" })
            .split(" ");
         const noSeconds =
            time[0]
               .split(":")
               .slice(0, 2)
               .join(":") +
            " " +
            time[1];
         document.querySelector("#time").innerText = noSeconds;
         document.querySelector("#day").innerText = weekdays[dayOfWeek];

         map.getEngine().setAnimationDuration(500);
         map.getViewModel().setLookAtData(
            {
               position: smooth[curr]
            },
            true
         );

         for (let i = 0; i < casinos.features.length; i++) {
            const point = turf.point([smooth[curr].lng, smooth[curr].lat]);
            const polygon = turf.polygon(casinos.features[i].geometry.coordinates);
            if (turf.booleanPointInPolygon(point, polygon)) {
               document.querySelector("#casino").innerText =
                  casinos.features[i].properties.name;
               break;
            }
         }

         const filteredLine = geometry.slice(0, curr * skip + 1);
         const newLinestring = new H.geo.LineString();
         filteredLine.forEach(r => newLinestring.pushPoint(r));
         routeLine.setGeometry(newLinestring);
      }
   }, ANIMATION_DURATION);
})();

function flyTo(options) {
   return new Promise(resolve => {
      map.getEngine().setAnimationDuration(options.duration);
      map.getViewModel().setLookAtData(options, true);
      setTimeout(() => {
         resolve();
      }, options.duration);
   });
}
