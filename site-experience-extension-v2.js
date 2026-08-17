const ROOT=new URL('./',import.meta.url);
const H=path=>new URL(path,ROOT).href;
const LANGS=['ko','en-US','en-GB','zh-CN','ja','es','fr'];
const rows=[
['서비스','Services','Services','服务','サービス','Servicios','Services'],
['전체 서비스','All services','All services','全部服务','すべてのサービス','Todos los servicios','Tous les services'],
['수하물 서비스','Baggage services','Baggage services','行李服务','手荷物サービス','Servicios de equipaje','Services bagages'],
['기내 서비스','Inflight services','Inflight services','机上服务','機内サービス','Servicios a bordo','Services à bord'],
['결제 · 환불','Payments · Refunds','Payments · Refunds','支付 · 退款','支払い・払い戻し','Pagos · Reembolsos','Paiements · Remboursements'],
['특별지원','Special assistance','Special assistance','特殊协助','特別サポート','Asistencia especial','Assistance spéciale'],
['여행알림','Travel alerts','Travel alerts','旅行提醒','旅行アラート','Alertas de viaje','Alertes de voyage'],
['특별도장 소개','Special liveries','Special liveries','特别涂装','特別塗装','Libreas especiales','Livrées spéciales'],
['호텔 · 렌터카','Hotels · Car rental','Hotels · Car hire','酒店 · 租车','ホテル・レンタカー','Hoteles · Alquiler de coches','Hôtels · Location de voitures'],
['뉴스','News','News','新闻','ニュース','Noticias','Actualités'],
['뉴스룸','Newsroom','Newsroom','新闻中心','ニュースルーム','Sala de prensa','Salle de presse'],
['채용','Careers','Careers','招聘','採用情報','Empleo','Carrières'],
['도장갤러리','Livery gallery','Livery gallery','涂装图库','塗装ギャラリー','Galería de libreas','Galerie des livrées'],
['객실 · 좌석 소개','Cabins · Seats','Cabins · Seats','客舱 · 座椅','客室・座席','Cabinas · Asientos','Cabines · Sièges'],
['객실·좌석','Cabins · Seats','Cabins · Seats','客舱 · 座椅','客室・座席','Cabinas · Asientos','Cabines · Sièges'],
['수하물','Baggage','Baggage','行李','手荷物','Equipaje','Bagages'],
['수하물 조회','Baggage tracking','Baggage tracking','行李查询','手荷物照会','Seguimiento de equipaje','Suivi des bagages'],
['기내 수하물','Cabin baggage','Cabin baggage','随身行李','機内持込手荷物','Equipaje de cabina','Bagage cabine'],
['위탁 수하물','Checked baggage','Checked baggage','托运行李','受託手荷物','Equipaje facturado','Bagage enregistré'],
['추가 · 특수 수하물','Extra · Special baggage','Extra · Special baggage','额外 · 特殊行李','追加・特殊手荷物','Equipaje extra · especial','Bagages supplémentaires · spéciaux'],
['미도착·파손 수하물','Delayed or damaged baggage','Delayed or damaged baggage','延误或损坏行李','未着・破損手荷物','Equipaje retrasado o dañado','Bagage retardé ou endommagé'],
['수하물 문의','Baggage support','Baggage support','行李咨询','手荷物お問い合わせ','Ayuda con equipaje','Assistance bagages'],
['수하물 규정','Baggage rules','Baggage rules','行李规定','手荷物規定','Normas de equipaje','Règles bagages'],
['기내식 · 음료','Meals · Drinks','Meals · Drinks','餐食 · 饮料','機内食・飲み物','Comidas · Bebidas','Repas · Boissons'],
['특별식','Special meals','Special meals','特殊餐食','特別食','Comidas especiales','Repas spéciaux'],
['객실 편의','Cabin amenities','Cabin amenities','客舱便利设施','機内アメニティ','Comodidades de cabina','Confort cabine'],
['Wi-Fi와 엔터테인먼트','Wi-Fi and entertainment','Wi-Fi and entertainment','Wi-Fi 与娱乐','Wi-Fiとエンターテインメント','Wi-Fi y entretenimiento','Wi-Fi et divertissement'],
['항공권 결제','Ticket payment','Ticket payment','机票支付','航空券の支払い','Pago de billetes','Paiement du billet'],
['예약 변경 · 취소','Booking changes · Cancellation','Booking changes · Cancellation','预订变更 · 取消','予約変更・取消','Cambios · Cancelación','Modification · Annulation'],
['환불','Refunds','Refunds','退款','払い戻し','Reembolsos','Remboursements'],
['결제 · 환불 조회','Payment · Refund status','Payment · Refund status','支付 · 退款查询','支払い・払い戻し確認','Estado de pago · reembolso','Statut paiement · remboursement'],
['상태 확인','Check status','Check status','查看状态','状態を確認','Consultar estado','Vérifier le statut'],
['예약 조회·관리','Manage reservation','Manage reservation','管理预订','予約を管理','Gestionar reserva','Gérer la réservation'],
['휠체어 · 이동지원','Wheelchair · Mobility assistance','Wheelchair · Mobility assistance','轮椅 · 行动协助','車いす・移動支援','Silla de ruedas · Movilidad','Fauteuil roulant · Mobilité'],
['유아 · 소아 동반','Infants · Children','Infants · Children','婴幼儿 · 儿童同行','乳幼児・お子さま連れ','Bebés · Niños','Bébés · Enfants'],
['의료 · 건강 지원','Medical · Health assistance','Medical · Health assistance','医疗 · 健康协助','医療・健康サポート','Asistencia médica · Salud','Assistance médicale · Santé'],
['특별지원 문의','Contact special assistance','Contact special assistance','联系特殊协助','特別サポートへ問い合わせ','Contactar asistencia especial','Contacter l’assistance spéciale'],
['현재 운항 상태 확인','Check current flight status','Check current flight status','查看当前航班状态','現在の運航状況を確認','Consultar estado actual','Vérifier le statut actuel'],
['운항 정보 보기','View flight information','View flight information','查看航班信息','運航情報を見る','Ver información de vuelo','Voir les informations de vol'],
['편명별 여행알림 설정','Set flight alerts','Set flight alerts','设置航班提醒','便名別アラート設定','Configurar alertas de vuelo','Configurer les alertes de vol'],
['알림 방식','Alert channel','Alert channel','提醒方式','通知方法','Canal de alerta','Canal d’alerte'],
['웹사이트 내 알림','Website alert','Website alert','网站内提醒','サイト内通知','Alerta en el sitio','Alerte sur le site'],
['이메일 알림(연동 준비)','Email alert (coming soon)','Email alert (coming soon)','邮件提醒（准备中）','メール通知（準備中）','Alerta por correo (próximamente)','Alerte e-mail (bientôt)'],
['푸시 알림(연동 준비)','Push alert (coming soon)','Push alert (coming soon)','推送提醒（准备中）','プッシュ通知（準備中）','Alerta push (próximamente)','Alerte push (bientôt)'],
['알림 저장','Save alert','Save alert','保存提醒','通知を保存','Guardar alerta','Enregistrer l’alerte'],
['도장갤러리 보기','View livery gallery','View livery gallery','查看涂装图库','塗装ギャラリーを見る','Ver galería de libreas','Voir la galerie des livrées'],
['보유 항공기','Our fleet','Our fleet','机队','保有機材','Nuestra flota','Notre flotte'],
['호텔','Hotels','Hotels','酒店','ホテル','Hoteles','Hôtels'],
['렌터카','Car rental','Car hire','租车','レンタカー','Alquiler de coches','Location de voitures'],
['목적지 보기','View destinations','View destinations','查看目的地','目的地を見る','Ver destinos','Voir les destinations'],
['운항 일정 보기','View flight schedule','View flight schedule','查看航班时刻','運航スケジュールを見る','Ver horarios','Voir les horaires'],
['공식 공지사항','Official notices','Official notices','官方公告','公式お知らせ','Avisos oficiales','Avis officiels'],
['웹사이트 서비스 확대','Expanded website services','Expanded website services','网站服务扩展','ウェブサービス拡充','Servicios web ampliados','Services web étendus'],
['노선 및 목적지','Routes and destinations','Routes and destinations','航线与目的地','路線・目的地','Rutas y destinos','Routes et destinations'],
['공지사항 전체보기','View all notices','View all notices','查看全部公告','すべてのお知らせ','Ver todos los avisos','Voir tous les avis'],
['함께 만드는 네 가지 전문 영역','Four professional areas','Four professional areas','四大专业领域','4つの専門領域','Cuatro áreas profesionales','Quatre domaines professionnels'],
['부서 상세 보기 →','View department →','View department →','查看部门 →','部門詳細 →','Ver departamento →','Voir le département →'],
['채용 계획','Recruitment plan','Recruitment plan','招聘计划','採用計画','Plan de contratación','Plan de recrutement'],
['주요 업무','What we do','What we do','主要职责','主な業務','Funciones principales','Missions principales'],
['예상 시기','Expected timing','Expected timing','预计时间','予定時期','Fecha prevista','Période prévue'],
['예정 직무','Planned roles','Planned roles','计划职位','予定職種','Puestos previstos','Postes prévus'],
['공고 기준','Posting','Posting','招聘公告','募集要項','Publicación','Annonce'],
['확정 시 공식 채용 공고 게시','Official posting when confirmed','Official posting when confirmed','确定后发布正式招聘公告','確定後に正式募集を掲載','Publicación oficial al confirmarse','Annonce officielle après confirmation'],
['← 채용 메인으로','← Back to careers','← Back to careers','← 返回招聘首页','← 採用トップへ','← Volver a empleo','← Retour aux carrières'],
['채용 계획 검토 중','Recruitment plan under review','Recruitment plan under review','招聘计划审核中','採用計画を検討中','Plan en revisión','Plan en cours d’étude'],
['채용 예정','Hiring planned','Hiring planned','计划招聘','採用予定','Contratación prevista','Recrutement prévu'],
['채용 진행 중','Hiring now','Hiring now','正在招聘','募集中','Contratación abierta','Recrutement en cours'],
['수시 채용 검토','Rolling hiring under review','Rolling hiring under review','滚动招聘评估中','随時採用を検討','Contratación continua en revisión','Recrutement continu à l’étude'],
['상시 채용','Open recruitment','Open recruitment','长期招聘','常時採用','Contratación permanente','Recrutement permanent'],
['현재 채용 계획 없음','No current hiring plan','No current hiring plan','暂无招聘计划','現在採用予定なし','Sin plan de contratación actual','Aucun recrutement prévu'],
['웹사이트 이용약관','Website Terms of Use','Website Terms of Use','网站使用条款','ウェブサイト利用規約','Términos de uso del sitio','Conditions d’utilisation du site'],
['국제여객 운송약관','International Passenger Conditions of Carriage','International Passenger Conditions of Carriage','国际旅客运输条件','国際旅客運送約款','Condiciones de transporte internacional de pasajeros','Conditions de transport international des passagers'],
['국제화물 운송약관','International Cargo Conditions of Carriage','International Cargo Conditions of Carriage','国际货物运输条件','国際貨物運送約款','Condiciones de transporte internacional de carga','Conditions de transport international du fret'],
['기타 법률 고지','Other Legal Notices','Other Legal Notices','其他法律声明','その他の法的通知','Otros avisos legales','Autres mentions légales'],
['개인정보처리방침','Privacy Policy','Privacy Policy','隐私政策','プライバシーポリシー','Política de privacidad','Politique de confidentialité'],
['예약 · 발권','Booking · Ticketing','Booking · Ticketing','预订 · 出票','予約・発券','Reserva · Emisión','Réservation · Billetterie'],
['온라인 체크인 · 탑승권','Online check-in · Boarding pass','Online check-in · Boarding pass','在线值机 · 登机牌','オンラインチェックイン・搭乗券','Check-in online · Tarjeta de embarque','Enregistrement en ligne · Carte d’embarquement'],
['여행정보','Travel information','Travel information','旅行信息','旅行情報','Información de viaje','Informations de voyage'],
['특별도장','Special liveries','Special liveries','特别涂装','特別塗装','Libreas especiales','Livrées spéciales'],
['좌석 안내','Seat guide','Seat guide','座椅指南','座席案内','Guía de asientos','Guide des sièges'],
['조회하기','Search','Search','查询','照会','Buscar','Rechercher'],
['예약번호','Booking reference','Booking reference','预订编号','予約番号','Referencia de reserva','Référence de réservation'],
['출발일','Departure date','Departure date','出发日期','出発日','Fecha de salida','Date de départ'],
['편명','Flight number','Flight number','航班号','便名','Número de vuelo','Numéro de vol'],
['여행 준비','Travel preparation','Travel preparation','旅行准备','旅行準備','Preparación del viaje','Préparer le voyage'],
['공지사항','Notices','Notices','公告','お知らせ','Avisos','Avis'],
['지원 센터','Support centre','Support centre','支持中心','サポートセンター','Centro de ayuda','Centre d’assistance'],
['기내수하물과 위탁수하물, 추가수하물, 특수수하물 기준을 확인하고 예약번호로 수하물 상태를 확인하세요.','Check cabin, checked, extra and special baggage rules, then use your booking reference to check baggage status.','Check cabin, checked, extra and special baggage rules, then use your booking reference to check baggage status.','查看随身、托运、额外和特殊行李规定，并使用预订编号查询行李状态。','機内持込・受託・追加・特殊手荷物の規定を確認し、予約番号で手荷物状況を確認できます。','Consulta las normas de equipaje y comprueba el estado con tu referencia de reserva.','Consultez les règles bagages et vérifiez le statut avec votre référence de réservation.'],
['기내식과 특별식, 연결 서비스, 엔터테인먼트, 좌석별 편의 서비스까지 객실에서 제공되는 경험을 안내합니다.','Explore meals, special meals, connectivity, entertainment and cabin amenities.','Explore meals, special meals, connectivity, entertainment and cabin amenities.','了解餐食、特殊餐、连接服务、娱乐及客舱便利设施。','機内食、特別食、接続サービス、エンターテインメント、客室設備をご案内します。','Descubre comidas, conectividad, entretenimiento y servicios de cabina.','Découvrez les repas, la connectivité, le divertissement et les services cabine.'],
['항공권 결제 방식과 예약 변경·취소·환불 절차를 확인하고 예약번호로 현재 처리 상태를 확인하세요.','Review payment, change, cancellation and refund procedures and check status with your booking reference.','Review payment, change, cancellation and refund procedures and check status with your booking reference.','查看支付、变更、取消和退款流程，并用预订编号查询状态。','支払い、変更、取消、払い戻し手続きを確認し、予約番号で状況を確認できます。','Consulta pagos, cambios, cancelaciones y reembolsos y verifica el estado con tu reserva.','Consultez paiements, modifications, annulations et remboursements, puis vérifiez le statut.'],
['이동지원, 유아·소아 동반, 의료적 지원이 필요한 승객을 위한 사전 준비와 공항·기내 지원 절차를 안내합니다.','Guidance for mobility assistance, families with children and passengers needing medical support.','Guidance for mobility assistance, families with children and passengers needing medical support.','为需要行动协助、携带婴幼儿或医疗支持的旅客提供指南。','移動支援、お子さま連れ、医療サポートが必要なお客さま向けのご案内です。','Guía para movilidad, familias con niños y asistencia médica.','Guide pour la mobilité, les familles avec enfants et l’assistance médicale.'],
['지연, 결항, 출도착 시각 변경 등 중요한 운항 변동을 빠르게 확인하고 관심 항공편을 저장하세요.','Check delays, cancellations and schedule changes quickly and save flights you want to follow.','Check delays, cancellations and schedule changes quickly and save flights you want to follow.','快速查看延误、取消及时间变更，并保存关注航班。','遅延、欠航、時刻変更を確認し、気になる便を保存できます。','Consulta retrasos, cancelaciones y cambios y guarda tus vuelos.','Consultez retards, annulations et changements et enregistrez vos vols.'],
['스텔라리스 브랜드와 노선의 이야기를 항공기 외관에 담는 특별도장 콘셉트를 소개합니다.','Discover special liveries inspired by the Stellaris brand and network.','Discover special liveries inspired by the Stellaris brand and network.','探索体现 Stellaris 品牌与航线故事的特别涂装。','STELLARISのブランドと路線を表現する特別塗装をご紹介します。','Descubre libreas especiales inspiradas en la marca y la red de Stellaris.','Découvrez les livrées spéciales inspirées de la marque et du réseau Stellaris.'],
['항공 여정 이후의 숙박과 현지 이동까지 한 번에 연결하기 위한 제휴 서비스 영역입니다.','Partner services designed to connect flights with hotels and local transportation.','Partner services designed to connect flights with hotels and local transport.','连接航班、住宿与当地交通的合作服务。','フライトと宿泊・現地移動をつなぐ提携サービスです。','Servicios asociados para conectar vuelos, hoteles y movilidad local.','Services partenaires reliant vols, hôtels et mobilité locale.'],
['항공사 소식, 웹·디지털 서비스 업데이트, 신규 노선 및 운항 관련 공지를 한곳에서 확인하세요.','Find airline news, digital service updates, new routes and operational notices in one place.','Find airline news, digital service updates, new routes and operational notices in one place.','在此查看航空公司新闻、数字服务更新、新航线及运营公告。','航空会社ニュース、デジタルサービス更新、新路線、運航案内をまとめて確認できます。','Consulta noticias, servicios digitales, nuevas rutas y avisos operativos.','Retrouvez actualités, services numériques, nouvelles routes et avis opérationnels.'],
['운항, 객실, 정비, 공항서비스, 디지털·기획 등 스텔라리스의 다양한 직무와 채용 계획을 확인하세요.','Explore Stellaris roles and recruitment plans across flight operations, cabin, maintenance, airport service, digital and corporate teams.','Explore Stellaris roles and recruitment plans across flight operations, cabin, maintenance, airport service, digital and corporate teams.','了解 Stellaris 在运行、客舱、维修、机场服务、数字与职能部门的职位及招聘计划。','運航、客室、整備、空港サービス、デジタル・コーポレート部門の職種と採用計画をご覧ください。','Conoce los puestos y planes de contratación de Stellaris.','Découvrez les métiers et plans de recrutement de Stellaris.']
];
const dictionary=new Map(rows.map(row=>[row[0],Object.fromEntries(LANGS.slice(1).map((lang,i)=>[lang,row[i+1]]))]));
const originals=new WeakMap();
function currentLanguage(){const html=document.documentElement.lang;if(LANGS.includes(html))return html;try{const stored=localStorage.getItem('stellaris-language');if(LANGS.includes(stored))return stored;}catch(e){}return 'ko';}
function apply(target=currentLanguage()){
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){const p=node.parentElement;if(!p||['SCRIPT','STYLE'].includes(p.tagName)||p.closest('[data-i18n-skip]')||!node.nodeValue.trim())continue;if(!originals.has(node))originals.set(node,node.nodeValue);const original=originals.get(node),key=original.trim(),entry=dictionary.get(key);if(!entry)continue;const value=target==='ko'?key:(entry[target]||key);if(node.nodeValue!==original.replace(key,value))node.nodeValue=original.replace(key,value);}
}
function addLink(host,path,label){if(!host)return;const absolute=H(path);if([...host.querySelectorAll('a')].some(a=>a.href===absolute))return;const a=document.createElement('a');a.href=absolute;a.textContent=label;host.appendChild(a);}
function installNavigation(){
 const main=document.querySelector('.main-nav');
 if(main&&!main.querySelector('[data-services-nav]')){const item=document.createElement('div');item.className='nav-item';item.dataset.servicesNav='true';item.innerHTML=`<a href="${H('services/')}">서비스</a><div class="mega-menu"><div class="mega-inner shell-wide"><div class="mega-title"><span>STELLARIS AIRLINES</span><strong>서비스</strong></div><div class="mega-links"><a href="${H('services/')}">전체 서비스</a><a href="${H('baggage/')}">수하물 서비스</a><a href="${H('inflight-service/')}">기내 서비스</a><a href="${H('payments-refunds/')}">결제 · 환불</a><a href="${H('special-assistance/')}">특별지원</a><a href="${H('travel-alerts/')}">여행알림</a><a href="${H('seats/')}">객실 · 좌석 소개</a><a href="${H('hotel-car/')}">호텔 · 렌터카</a><a href="${H('special-liveries/')}">특별도장 소개</a><a href="${H('livery-gallery/')}">도장갤러리</a></div></div></div>`;const support=[...main.children].find(el=>el.querySelector(':scope > a')?.href===H('support/'));support?main.insertBefore(item,support):main.appendChild(item);}
 const about=[...document.querySelectorAll('.mega-title strong')].find(el=>originals.get(el.firstChild)?.trim()==='항공사 정보'||el.textContent.trim()==='항공사 정보')?.closest('.mega-inner')?.querySelector('.mega-links');addLink(about,'news/','뉴스');addLink(about,'careers/','채용');
 const mobile=document.getElementById('mobileNav');[['services/','전체 서비스'],['baggage/','수하물 서비스'],['inflight-service/','기내 서비스'],['payments-refunds/','결제 · 환불'],['special-assistance/','특별지원'],['travel-alerts/','여행알림'],['seats/','객실 · 좌석 소개'],['hotel-car/','호텔 · 렌터카'],['special-liveries/','특별도장 소개'],['livery-gallery/','도장갤러리'],['news/','뉴스'],['careers/','채용']].forEach(([p,l])=>addLink(mobile,p,l));
 document.querySelectorAll('.footer-columns>div').forEach(col=>{const title=col.querySelector('strong')?.textContent.trim();if(title==='항공사'){addLink(col,'news/','뉴스');addLink(col,'careers/','채용');addLink(col,'special-liveries/','특별도장 소개');addLink(col,'livery-gallery/','도장갤러리');}if(title==='여행')addLink(col,'hotel-car/','호텔 · 렌터카');if(title==='서비스'){addLink(col,'services/','전체 서비스');addLink(col,'baggage/','수하물 서비스');addLink(col,'inflight-service/','기내 서비스');addLink(col,'payments-refunds/','결제 · 환불');addLink(col,'special-assistance/','특별지원');addLink(col,'travel-alerts/','여행알림');addLink(col,'seats/','객실 · 좌석 소개');}});
 const legal=document.querySelector('.footer-bottom>div');if(legal&&!legal.dataset.extendedLegal){legal.dataset.extendedLegal='true';legal.innerHTML='';[['terms/','웹사이트 이용약관'],['international-passenger-conditions/','국제여객 운송약관'],['international-cargo-conditions/','국제화물 운송약관'],['legal-notices/','기타 법률 고지'],['privacy/','개인정보처리방침']].forEach(([p,l])=>addLink(legal,p,l));}
 apply();
}
installNavigation();
setTimeout(()=>{installNavigation();apply();},500);
window.addEventListener('stellaris:languagechange',e=>setTimeout(()=>apply(e.detail?.language||currentLanguage()),0));
