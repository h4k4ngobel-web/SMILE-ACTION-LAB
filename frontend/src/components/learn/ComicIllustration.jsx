const SCENES = {
  school: { sky: "#DFF3FF", wall: "#E9F7FF", prop: "school", label: "Ruang belajar" },
  home: { sky: "#FFF0D7", wall: "#FFF9EC", prop: "home", label: "Rumah" },
  community: { sky: "#E5F8F1", wall: "#F1FCF7", prop: "community", label: "Ruang PIK-R" },
  clinic: { sky: "#E7F2FF", wall: "#F4F8FF", prop: "clinic", label: "Ruang konsultasi" },
  park: { sky: "#DFF5E6", wall: "#F1FBF0", prop: "park", label: "Taman" },
  market: { sky: "#FFE9D9", wall: "#FFF6EC", prop: "market", label: "Pasar" },
  career: { sky: "#EAE6FF", wall: "#F5F2FF", prop: "career", label: "Pameran minat dan karier" },
};

const Teen = ({ x, skin, hair, shirt, bag }) => (
  <g transform={`translate(${x} 0)`}>
    <ellipse cx="0" cy="309" rx="39" ry="8" fill="#19264C" opacity=".12" />
    <path d="M-25 271h19v33h-19zM7 271h19v33H7z" fill="#263659" />
    <path d="M-32 299h28v10h-31c-5 0-5-7 3-10zM5 299h28c8 3 8 10 2 10H5z" fill="#FFFFFF" stroke="#263659" strokeWidth="3" />
    <path d="M-34 195c7-13 18-19 34-19s27 6 34 19l11 76h-90z" fill={shirt} stroke="#19264C" strokeWidth="3" />
    <path d="M-31 204l-17 42 13 7 20-38M31 204l17 42-13 7-20-38" fill={skin} stroke="#19264C" strokeWidth="3" strokeLinejoin="round" />
    {bag && <path d="M-39 202c-8 7-9 24-8 42l13 3 8-39z" fill="#FFA24A" stroke="#19264C" strokeWidth="3" />}
    <circle cx="0" cy="145" r="36" fill={skin} stroke="#19264C" strokeWidth="3" />
    <path d="M-34 143c-6-28 11-49 37-45 21 3 34 20 30 43-9-5-15-16-16-27-10 12-29 17-51 16z" fill={hair} stroke="#19264C" strokeWidth="3" strokeLinejoin="round" />
    <path d="M-14 151h1M13 151h1" stroke="#19264C" strokeWidth="5" strokeLinecap="round" />
    <path d="M-8 163q8 8 16 0" fill="none" stroke="#A94F55" strokeWidth="3" strokeLinecap="round" />
    <path d="M-11 184v9h22v-9" fill={skin} />
    <path d="M-13 221h26" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity=".7" />
  </g>
);

const SceneProps = ({ type }) => {
  if (type === "school") {
    return (
      <g>
        <rect x="72" y="58" width="247" height="112" rx="10" fill="#FFFFFF" stroke="#19264C" strokeWidth="4" />
        <rect x="82" y="68" width="227" height="90" rx="5" fill="#4F8B77" />
        <path d="M103 91h108M103 111h151M103 132h72" stroke="#E8FFF4" strokeWidth="5" strokeLinecap="round" />
        <path d="M352 160h110v18H352z" fill="#D6A36B" stroke="#19264C" strokeWidth="3" />
      </g>
    );
  }
  if (type === "home") {
    return (
      <g>
        <path d="M75 132l111-84 112 84v54H75z" fill="#FFE0AE" stroke="#19264C" strokeWidth="4" strokeLinejoin="round" />
        <path d="M59 135l127-97 128 97" fill="none" stroke="#D87665" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="103" y="104" width="49" height="45" rx="5" fill="#BCE9F4" stroke="#19264C" strokeWidth="3" />
        <path d="M128 105v43M104 126h48" stroke="#FFFFFF" strokeWidth="4" />
        <rect x="202" y="119" width="42" height="67" rx="5" fill="#A97558" stroke="#19264C" strokeWidth="3" />
      </g>
    );
  }
  if (type === "community") {
    return (
      <g>
        <rect x="74" y="62" width="251" height="112" rx="12" fill="#FFFFFF" stroke="#19264C" strokeWidth="4" />
        <rect x="85" y="73" width="229" height="90" rx="7" fill="#D7F4E9" />
        <text x="199" y="112" textAnchor="middle" fill="#19264C" fontSize="22" fontWeight="800" fontFamily="Arial, sans-serif">PIK-R</text>
        <path d="M125 131h149" stroke="#4FC6B0" strokeWidth="7" strokeLinecap="round" />
        <path d="M355 159h110v18H355z" fill="#D6A36B" stroke="#19264C" strokeWidth="3" />
      </g>
    );
  }
  if (type === "clinic") {
    return (
      <g>
        <rect x="83" y="56" width="244" height="119" rx="12" fill="#FFFFFF" stroke="#19264C" strokeWidth="4" />
        <rect x="95" y="68" width="220" height="95" rx="8" fill="#DDF1FF" />
        <rect x="163" y="81" width="83" height="42" rx="10" fill="#FFFFFF" stroke="#19264C" strokeWidth="3" />
        <path d="M196 88h17v11h12v17h-12v11h-17v-11h-12V99h12z" fill="#E87579" />
        <path d="M115 144h177" stroke="#8DBBCE" strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }
  if (type === "park") {
    return (
      <g>
        <path d="M0 211q140-58 282-8t358 0v157H0z" fill="#B9E6B9" />
        <circle cx="104" cy="94" r="42" fill="#9AD6A2" />
        <circle cx="76" cy="111" r="27" fill="#73BF8A" />
        <path d="M103 124v95M78 187h75v12H78zM88 199v18M143 199v18" stroke="#895F48" strokeWidth="8" strokeLinecap="round" />
        <path d="M444 164h104M455 164v20M537 164v20" stroke="#895F48" strokeWidth="8" strokeLinecap="round" />
      </g>
    );
  }
  if (type === "market") {
    return (
      <g>
        <path d="M80 109h252l-20-48H101z" fill="#FFA24A" stroke="#19264C" strokeWidth="4" strokeLinejoin="round" />
        <path d="M102 62v47M155 62v47M208 62v47M261 62v47" stroke="#FFFFFF" strokeWidth="6" />
        <rect x="95" y="111" width="225" height="66" rx="8" fill="#F6D6AC" stroke="#19264C" strokeWidth="4" />
        <circle cx="152" cy="140" r="15" fill="#FFDA79" stroke="#19264C" strokeWidth="3" />
        <circle cx="198" cy="140" r="15" fill="#FFDA79" stroke="#19264C" strokeWidth="3" />
        <path d="M235 147h54" stroke="#D78B49" strokeWidth="7" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <rect x="74" y="57" width="254" height="118" rx="12" fill="#FFFFFF" stroke="#19264C" strokeWidth="4" />
      <rect x="86" y="69" width="230" height="94" rx="7" fill="#E6E0FF" />
      <path d="M124 132l28-38 27 38M137 132l15-21 16 21" fill="none" stroke="#7552D6" strokeWidth="6" strokeLinejoin="round" />
      <path d="M208 94h77M208 114h61M208 134h48" stroke="#8D7BD0" strokeWidth="5" strokeLinecap="round" />
      <path d="M373 162h118v16H373z" fill="#D6A36B" stroke="#19264C" strokeWidth="3" />
    </g>
  );
};

export default function ComicIllustration({ setting = "community", title }) {
  const scene = SCENES[setting] || SCENES.community;

  return (
    <svg viewBox="0 0 640 360" role="img" aria-label={`Ilustrasi ${scene.label}: ${title || "Alya, Raka, dan SMILO"}`}
      className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="640" height="360" fill={scene.sky} />
      <circle cx="555" cy="56" r="31" fill="#FFDA79" />
      <path d="M0 227q105-30 215 4t214-4q101-31 211 0v133H0z" fill={scene.wall} />
      <SceneProps type={scene.prop} />
      <path d="M0 284q150-22 288 1t352-2v77H0z" fill="#A9DDBD" />
      <path d="M0 310q164-12 314 1t326-1v50H0z" fill="#80C9A1" />
      <Teen x={174} skin="#C98262" hair="#2E2631" shirt="#7552D6" bag />
      <Teen x={354} skin="#E5AE83" hair="#443044" shirt="#3BAF9B" />
      <image href="/brand/smilo-study.png" x="462" y="171" width="132" height="145" preserveAspectRatio="xMidYMid meet" />
      <path d="M490 160q16-18 33 0M536 153q12-15 25 0" fill="none" stroke="#19264C" strokeWidth="4" strokeLinecap="round" />
      <text x="526" y="333" textAnchor="middle" fill="#19264C" fontSize="14" fontWeight="800" fontFamily="Arial, sans-serif">SMILO</text>
    </svg>
  );
}
