import { Apartment } from '@/types';

export const APARTMENTS: Apartment[] = [
  // ========== 티어 12 (매매가 12억 이하) ==========

  // 성북구
  { id: 'seongbuk-jangwi-ipk', name: '장위 꿈의숲아이파크', district: '성북구', size: '24평', basePrice: 11.6, tier: '12', naverComplexId: '122863' },
  { id: 'seongbuk-raemian-jangwi', name: '래미안장위포레카운티', district: '성북구', size: '24평', basePrice: 11, tier: '12', naverComplexId: '113549' },
  { id: 'seongbuk-raemian-areum', name: '래미안아름숲', district: '성북구', size: '24평', basePrice: 11, tier: '12', naverComplexId: '26918' },
  { id: 'seongbuk-gileum2-prugio', name: '길음2단지푸르지오', district: '성북구', size: '43평', basePrice: 11.2, tier: '12', naverComplexId: '8082' },
  { id: 'seongbuk-gileum-raemian8-back', name: '길음래미안8단지 뒷동', district: '성북구', size: '24평', basePrice: 11.5, tier: '12', naverComplexId: '26159' },

  // 동대문구
  { id: 'dongdaemun-dapsimni-donga', name: '답십리동아', district: '동대문구', size: '38평', basePrice: 9.5, tier: '12', naverComplexId: '3270' },
  { id: 'dongdaemun-imun-epyeon', name: '이문e편한세상', district: '동대문구', size: '32평', basePrice: 10.8, tier: '12', naverComplexId: '8199' },
  { id: 'dongdaemun-jeonnong-sk', name: '전농SK', district: '동대문구', size: '42평', basePrice: 12, tier: '12', naverComplexId: '3276' },
  { id: 'dongdaemun-imun-raemian2', name: '이문래미안2차', district: '동대문구', size: '34평', basePrice: 12, tier: '12', naverComplexId: '8791' },
  { id: 'dongdaemun-jegi-hanshin', name: '제기동 한신', district: '동대문구', size: '34평', basePrice: 11.5, tier: '12', naverComplexId: '3277' },
  { id: 'dongdaemun-jangan-hyundai', name: '장안 현대홈타운', district: '동대문구', size: '24평', basePrice: 9, tier: '12', naverComplexId: '3376' },
  { id: 'dongdaemun-jeonnong-woosung', name: '전농우성', district: '동대문구', size: '28평', basePrice: 8.5, tier: '12', naverComplexId: '346' },
  { id: 'dongdaemun-jeonnong-donga', name: '전농동아', district: '동대문구', size: '24평', basePrice: 8.3, tier: '12', naverComplexId: '1126' },

  // 강서구
  { id: 'gangseo-gayang2', name: '가양2단지', district: '강서구', size: '17평', basePrice: 7.7, tier: '12', naverComplexId: '1305' },
  { id: 'gangseo-gayang6', name: '가양6단지', district: '강서구', size: '19평', basePrice: 10, tier: '12', naverComplexId: '1347' },
  { id: 'gangseo-deungchon-ipk', name: '등촌아이파크', district: '강서구', size: '34평', basePrice: 11, tier: '12', naverComplexId: '13859' },
  { id: 'gangseo-gayang-woosung', name: '가양우성', district: '강서구', size: '27평', basePrice: 10, tier: '12', naverComplexId: '1350' },
  { id: 'gangseo-yeomchang-donga1', name: '염창동아1차', district: '강서구', size: '34평', basePrice: 11.5, tier: '12', naverComplexId: '869' },

  // 강동구
  { id: 'gangdong-gangil3', name: '강일리버파크3단지', district: '강동구', size: '24평', basePrice: 11.5, tier: '12', naverComplexId: '27474' },
  { id: 'gangdong-gangil5', name: '강일리버파크5단지', district: '강동구', size: '24평', basePrice: 12, tier: '12', naverComplexId: '27477' },
  { id: 'gangdong-godeok-rien3', name: '고덕리엔파크3단지', district: '강동구', size: '34평', basePrice: 12.5, tier: '12', naverComplexId: '102235' },
  { id: 'gangdong-godeok-rien2', name: '고덕리엔파크2단지', district: '강동구', size: '24평', basePrice: 12, tier: '12', naverComplexId: '102234' },
  { id: 'gangdong-myungil-gs', name: '명일GS', district: '강동구', size: '24평', basePrice: 11.5, tier: '12', naverComplexId: '903' },

  // 영등포구
  { id: 'yeongdeungpo-singil-samsung', name: '신길삼성', district: '영등포구', size: '24평', basePrice: 10, tier: '12', naverComplexId: '3793' },
  { id: 'yeongdeungpo-dangsan-hangang', name: '당산동 한강', district: '영등포구', size: '24평', basePrice: 12.2, tier: '12' },

  // 양천구
  { id: 'yangcheon-mokdong-samsung2', name: '목동 삼성래미안2차', district: '양천구', size: '24평', basePrice: 11.7, tier: '12', naverComplexId: '3440' },
  { id: 'yangcheon-mokdong-woosung2', name: '목동우성2차', district: '양천구', size: '34평', basePrice: 11.3, tier: '12', naverComplexId: '8742' },
  { id: 'yangcheon-sinjeong-lotte', name: '신정뉴타운롯데캐슬', district: '양천구', size: '34평', basePrice: 11.5, tier: '12', naverComplexId: '107728' },
  { id: 'yangcheon-mokdong-central-ipk', name: '목동센트럴아이파크위브', district: '양천구', size: '24평', basePrice: 11.7, tier: '12', naverComplexId: '117329' },
  { id: 'yangcheon-mokdong-lotte-winner', name: '목동롯데캐슬위너', district: '양천구', size: '24평', basePrice: 11.8, tier: '12', naverComplexId: '10307' },

  // 관악구
  { id: 'gwanak-dreamtown', name: '관악드림타운', district: '관악구', size: '24평', basePrice: 10, tier: '12', naverComplexId: '2987' },
  { id: 'gwanak-dongbu', name: '관악동부센트레빌', district: '관악구', size: '24평', basePrice: 11, tier: '12', naverComplexId: '9497' },
  { id: 'gwanak-hyundai', name: '관악현대', district: '관악구', size: '23평', basePrice: 8.3, tier: '12', naverComplexId: '45' },
  { id: 'gwanak-woosung', name: '관악우성', district: '관악구', size: '24평', basePrice: 8.4, tier: '12', naverComplexId: '1048' },
  { id: 'gwanak-prugio', name: '관악푸르지오', district: '관악구', size: '24평', basePrice: 11, tier: '12', naverComplexId: '2988' },
  { id: 'gwanak-boramae-samsung', name: '보라매삼성', district: '관악구', size: '34평', basePrice: 10.5, tier: '12', naverComplexId: '48' },
  { id: 'gwanak-sillim-prugio1', name: '신림푸르지오1차', district: '관악구', size: '34평', basePrice: 9.8, tier: '12', naverComplexId: '8877' },
  { id: 'gwanak-naksungdae-hyundai', name: '낙성대현대홈타운', district: '관악구', size: '43평', basePrice: 11.5, tier: '12', naverComplexId: '3332' },

  // ========== 티어 14 (매매가 14억 이하) ==========

  // 용산구
  { id: 'yongsan-hangangtown', name: '한강타운', district: '용산구', size: '24평', basePrice: 12.8, tier: '14', naverComplexId: '1351' },

  // 성동구
  { id: 'seongdong-seongsu-woobang2', name: '성수우방2차', district: '성동구', size: '24평', basePrice: 13.5, tier: '14', naverComplexId: '324' },

  // 영등포구
  { id: 'yeongdeungpo-yangpyung-hanshin', name: '양평한신', district: '영등포구', size: '34평', basePrice: 14.8, tier: '14', naverComplexId: '735' },
  { id: 'yeongdeungpo-prugio', name: '영등포푸르지오', district: '영등포구', size: '24평', basePrice: 14, tier: '14', naverComplexId: '3457' },

  // 성북구
  { id: 'seongbuk-gileum-raemian8-front', name: '길음래미안8단지 815(앞동)', district: '성북구', size: '24평', basePrice: 13.5, tier: '14', naverComplexId: '26159' },
  { id: 'seongbuk-gileum-centerpiece', name: '길음 센터피스', district: '성북구', size: '24평', basePrice: 14, tier: '14' },
  { id: 'seongbuk-gileum-raemian1', name: '길음래미안 1단지', district: '성북구', size: '34평', basePrice: 12, tier: '14', naverComplexId: '3422' },

  // 비잠실송파
  { id: 'songpa-parkdale2', name: '파크데일2단지', district: '비잠실송파', size: '44평', basePrice: 14, tier: '14', naverComplexId: '102314' },
  { id: 'songpa-pungnap-donga', name: '풍납동 동아한가람', district: '비잠실송파', size: '34평', basePrice: 15, tier: '14', naverComplexId: '643' },
  { id: 'songpa-samsung-gwangnaru', name: '삼성광나루', district: '비잠실송파', size: '24평', basePrice: 13, tier: '14', naverComplexId: '3116' },
  { id: 'songpa-dunchon-misojieum', name: '둔촌신성미소지움', district: '비잠실송파', size: '24평', basePrice: 13, tier: '14', naverComplexId: '1296' },
  { id: 'songpa-the-platinum', name: '송파더플래티넘', district: '비잠실송파', size: '21평', basePrice: 12, tier: '14', naverComplexId: '147185' },

  // 마포구
  { id: 'mapo-coolong', name: '코오롱하늘채', district: '마포구', size: '34평', basePrice: 12.5, tier: '14', naverComplexId: '103105' },
  { id: 'mapo-singongdeok-samsung2', name: '신공덕삼성래미안2차', district: '마포구', size: '24평', basePrice: 14.9, tier: '14', naverComplexId: '2993' },
  { id: 'mapo-hangang-ipk', name: '마포한강아이파크', district: '마포구', size: '24평', basePrice: 13.7, tier: '14', naverComplexId: '115201' },

  // 동작구
  { id: 'dongjak-sindaebang-woosung1', name: '신대방우성1차', district: '동작구', size: '24평', basePrice: 13, tier: '14', naverComplexId: '391' },
  { id: 'dongjak-daebang-daelim', name: '대방대림', district: '동작구', size: '24평', basePrice: 14, tier: '14', naverComplexId: '364' },

  // 강서구
  { id: 'gangseo-gangnaru-hyundai', name: '강나루현대', district: '강서구', size: '34평', basePrice: 13.5, tier: '14', naverComplexId: '1012' },
  { id: 'gangseo-woojangsan-lotte', name: '우장산롯데캐슬', district: '강서구', size: '34평', basePrice: 13.5, tier: '14', naverComplexId: '3331' },
  { id: 'gangseo-hangang-zai', name: '강서한강자이', district: '강서구', size: '24평', basePrice: 15, tier: '14', naverComplexId: '103293' },

  // 관악구
  { id: 'gwanak-epyeon-snu', name: 'e편한세상서울대입구', district: '관악구', size: '24평', basePrice: 13.7, tier: '14', naverComplexId: '114809' },

  // 강동구
  { id: 'gangdong-seongnae-samsung', name: '성내삼성', district: '강동구', size: '24평', basePrice: 12.5, tier: '14', naverComplexId: '993' },
  { id: 'gangdong-seonsa-hyundai', name: '선사현대', district: '강동구', size: '24평', basePrice: 14.5, tier: '14', naverComplexId: '3118' },

  // 동대문구
  { id: 'dongdaemun-dapsimni-parkzai-59', name: '답십리 파크자이 59타입', district: '동대문구', size: '59타입', basePrice: 14, tier: '14', naverComplexId: '113059' },
  { id: 'dongdaemun-raemian-weave', name: '래미안위브', district: '동대문구', size: '59타입', basePrice: 15.5, tier: '14', naverComplexId: '104202' },

  // ========== 티어 16 (매매가 16억 이하) ==========

  // 동대문구
  { id: 'dongdaemun-dapsimni-parkzai', name: '답십리 파크자이', district: '동대문구', size: '24평', basePrice: 14, tier: '16', naverComplexId: '113059' },
  { id: 'dongdaemun-raemian-crecity', name: '래미안크레시티', district: '동대문구', size: '24평', basePrice: 15.6, tier: '16', naverComplexId: '103797' },
  { id: 'dongdaemun-hwegyeong-zai', name: '휘경자이디센시아', district: '동대문구', size: '24평', basePrice: 15.5, tier: '16', naverComplexId: '157123' },
  { id: 'dongdaemun-imun-ipk-zai', name: '이문아이파크자이', district: '동대문구', size: '24평', basePrice: 16.5, tier: '16', naverComplexId: '174562' },

  // 성북구
  { id: 'seongbuk-gileum-lotte-clasia', name: '길음 롯데캐슬클라시아', district: '성북구', size: '24평', basePrice: 14.5, tier: '16', naverComplexId: '126062' },

  // 마포구
  { id: 'mapo-dangsan-jinro', name: '당산 진로', district: '마포구', size: '34평', basePrice: 15, tier: '16', naverComplexId: '684' },
  { id: 'mapo-sangam-worldcup4', name: '상암월드컵4단지', district: '마포구', size: '34평', basePrice: 16, tier: '16', naverComplexId: '23620' },

  // 동작구
  { id: 'dongjak-sangdo-prugio', name: '상도푸르지오클라베뉴', district: '동작구', size: '24평', basePrice: 16, tier: '16', naverComplexId: '161181' },
  { id: 'dongjak-boramae-zai', name: '보라매자이더포레스트', district: '동작구', size: '24평', basePrice: 16, tier: '16', naverComplexId: '123898' },

  // 비잠실송파
  { id: 'songpa-thesharp-prestige', name: '더샵파크프레스티지', district: '비잠실송파', size: '24평', basePrice: 15, tier: '16', naverComplexId: '128302' },
  { id: 'songpa-raemian-ellinity', name: '래미안엘리니티', district: '비잠실송파', size: '24평', basePrice: 15, tier: '16', naverComplexId: '133184' },

  // 강동구
  { id: 'gangdong-raemian-palace', name: '래미안강동팰리스', district: '강동구', size: '24평', basePrice: 15.5, tier: '16', naverComplexId: '107537' },

  // 영등포구
  { id: 'yeongdeungpo-dangsan-samsung2', name: '당산삼성2차', district: '영등포구', size: '34평', basePrice: 15.5, tier: '16', naverComplexId: '677' },
  { id: 'yeongdeungpo-art-zai', name: '영등포 아트자이', district: '영등포구', size: '24평', basePrice: 15, tier: '16', naverComplexId: '104960' },

  // 강서구
  { id: 'gangseo-hangang-zai-16', name: '강서한강자이', district: '강서구', size: '24평', basePrice: 15, tier: '16', naverComplexId: '103293' },

  // ========== 티어 20 (매매가 20억 이하) ==========

  // 동대문구
  { id: 'dongdaemun-cheongnyangni-l65', name: '청량리 L65', district: '동대문구', size: '34평', basePrice: 18, tier: '20' },

  // 성동구
  { id: 'seongdong-wangsimni-zai', name: '왕십리자이', district: '성동구', size: '24평', basePrice: 17.6, tier: '20', naverComplexId: '111002' },

  // 강서구
  { id: 'gangseo-epyeon-yeomchang', name: 'e편한세상 염창', district: '강서구', size: '34평', basePrice: 17, tier: '20', naverComplexId: '115965' },
  { id: 'gangseo-magok14', name: '마곡엠벨리14단지', district: '강서구', size: '34평', basePrice: 17.5, tier: '20', naverComplexId: '107504' },

  // 영등포구
  { id: 'yeongdeungpo-dongbu-centrevil', name: '동부센트레빌', district: '영등포구', size: '40평대', basePrice: 17, tier: '20', naverComplexId: '3421' },
  { id: 'yeongdeungpo-raemian-prevenu', name: '래미안프레비뉴', district: '영등포구', size: '24평', basePrice: 16.3, tier: '20', naverComplexId: '107424' },
  { id: 'yeongdeungpo-munrae-zai', name: '문래자이', district: '영등포구', size: '34평', basePrice: 16.5, tier: '20', naverComplexId: '3452' },
  { id: 'yeongdeungpo-prior-palace', name: '프라이어팰리스', district: '영등포구', size: '24평', basePrice: 16.5, tier: '20', naverComplexId: '19578' },
  { id: 'yeongdeungpo-singil-parkzai', name: '신길파크자이', district: '영등포구', size: '24평', basePrice: 17, tier: '20', naverComplexId: '121788' },

  // 강동구
  { id: 'gangdong-raemian-palace-20', name: '래미안강동팰리스', district: '강동구', size: '24평', basePrice: 15.5, tier: '20', naverComplexId: '107537' },
  { id: 'gangdong-raemian-solvenu', name: '래미안솔베뉴', district: '강동구', size: '24평', basePrice: 18.5, tier: '20', naverComplexId: '113432' },
  { id: 'gangdong-godeok-raemian-hs', name: '고덕래미안힐스테이트', district: '강동구', size: '24평', basePrice: 17.9, tier: '20', naverComplexId: '108187' },

  // 관악구
  { id: 'gwanak-hillstate-centciel', name: '힐스테이트관악센트씨엘', district: '관악구', size: '34평', basePrice: 18, tier: '20', naverComplexId: '170442' },

  // 마포구
  { id: 'mapo-sangam-worldcup4-20', name: '상암월드컵4단지', district: '마포구', size: '34평', basePrice: 16, tier: '20', naverComplexId: '23620' },
  { id: 'mapo-sungsan-siyoung', name: '성산시영', district: '마포구', size: '23평', basePrice: 17, tier: '20', naverComplexId: '410' },
  { id: 'mapo-hangang-prugio', name: '마포한강푸르지오', district: '마포구', size: '34평', basePrice: 19, tier: '20', naverComplexId: '107548' },
  { id: 'mapo-samsung', name: '마포 삼성', district: '마포구', size: '27평', basePrice: 19, tier: '20', naverComplexId: '404' },

  // 동작구
  { id: 'dongjak-sadang-lotte', name: '사당롯데캐슬골든포레', district: '동작구', size: '24평', basePrice: 16.5, tier: '20', naverComplexId: '115936' },
  { id: 'dongjak-hillstate-sangdo-cp', name: '힐스테이트상도센트럴파크', district: '동작구', size: '34평', basePrice: 18.5, tier: '20', naverComplexId: '22491' },
  { id: 'dongjak-raemian-sangdo3', name: '래미안상도3차', district: '동작구', size: '42평', basePrice: 18.3, tier: '20', naverComplexId: '9194' },
  { id: 'dongjak-hillstate-sangdo-pres', name: '힐스테이트상도프레스티지', district: '동작구', size: '34평', basePrice: 17, tier: '20', naverComplexId: '22846' },

  // 송파구
  { id: 'songpa-garak-kumho', name: '가락금호', district: '송파구', size: '24평', basePrice: 17.8, tier: '20', naverComplexId: '594' },
  { id: 'songpa-signature-lotte', name: '송파시그니처롯데캐슬', district: '송파구', size: '24평', basePrice: 17.9, tier: '20', naverComplexId: '127132' },

  // ========== 티어 24 (매매가 24억 이하) ==========

  // 성동구
  { id: 'seongdong-seoulforest-hs', name: '서울숲힐스테이트', district: '성동구', size: '24평', basePrice: 25, tier: '24', naverComplexId: '27424' },
  { id: 'seongdong-seoulforest-prugio2', name: '서울숲푸르지오2차', district: '성동구', size: '24평', basePrice: 23, tier: '24', naverComplexId: '101322' },
  { id: 'seongdong-seoulforest-prugio1', name: '서울숲푸르지오1차', district: '성동구', size: '24평', basePrice: 21, tier: '24', naverComplexId: '18541' },
  { id: 'seongdong-singumho-parkzai', name: '신금호파크자이', district: '성동구', size: '24평', basePrice: 21, tier: '24', naverComplexId: '110226' },
  { id: 'seongdong-kumho-parkhills', name: '금호파크힐스', district: '성동구', size: '24평', basePrice: 22, tier: '24', naverComplexId: '110936' },
  { id: 'seongdong-raemian-wellstream', name: '래미안웰스트림', district: '성동구', size: '24평', basePrice: 21, tier: '24', naverComplexId: '107438' },

  // 강서구
  { id: 'gangseo-magok7', name: '마곡엠벨리7단지', district: '강서구', size: '34평', basePrice: 22, tier: '24', naverComplexId: '107477' },

  // 영등포구
  { id: 'yeongdeungpo-dangsan-central-ipk', name: '당산센트럴아이파크', district: '영등포구', size: '24평', basePrice: 23, tier: '24', naverComplexId: '121987' },
  { id: 'yeongdeungpo-dangsan-samsung-raemian', name: '당산삼성래미안', district: '영등포구', size: '34평', basePrice: 22, tier: '24', naverComplexId: '2981' },

  // 강동구
  { id: 'gangdong-godeok-gracium', name: '고덕 그라시움', district: '강동구', size: '24평', basePrice: 22, tier: '24', naverComplexId: '113907' },

  // 용산구
  { id: 'yongsan-epyeon', name: '용산e편한세상', district: '용산구', size: '24평', basePrice: 22, tier: '24', naverComplexId: '27355' },
  { id: 'yongsan-lotte-centerfore', name: '용산롯데캐슬센터포레', district: '용산구', size: '34평', basePrice: 23, tier: '24', naverComplexId: '114334' },
  { id: 'yongsan-ichon-daelim', name: '이촌 대림 조망굿', district: '용산구', size: '34평', basePrice: 21, tier: '24', naverComplexId: '762' },
  { id: 'yongsan-sanho', name: '용산 산호', district: '용산구', size: '34평', basePrice: 23.5, tier: '24', naverComplexId: '759' },

  // 마포구
  { id: 'mapo-raemian-bamsem2', name: '래미안밤섬리베뉴2', district: '마포구', size: '34평', basePrice: 21.5, tier: '24', naverComplexId: '104792' },
  { id: 'mapo-grand-zai', name: '마포그랑자이', district: '마포구', size: '24평', basePrice: 22, tier: '24', naverComplexId: '114542' },
  { id: 'mapo-raemian-prugio', name: '마포래미안푸르지오', district: '마포구', size: '24평', basePrice: 23.7, tier: '24', naverComplexId: '104917' },
  { id: 'mapo-prestige-zai', name: '마포프레스티지자이', district: '마포구', size: '24평', basePrice: 24, tier: '24', naverComplexId: '121608' },

  // 동작구
  { id: 'dongjak-epyeon-sangdo', name: 'e편한세상상도노빌리티', district: '동작구', size: '34평', basePrice: 21.8, tier: '24', naverComplexId: '113097' },
  { id: 'dongjak-raemian-roipark', name: '래미안로이파크', district: '동작구', size: '34평', basePrice: 21, tier: '24', naverComplexId: '111467' },
  { id: 'dongjak-raemian-twinpark', name: '래미안 트윈파크', district: '동작구', size: '24평', basePrice: 19, tier: '24', naverComplexId: '100694' },

  // 송파구
  { id: 'songpa-munjeong-raemian', name: '문정래미안', district: '송파구', size: '48평', basePrice: 23, tier: '24', naverComplexId: '3033' },
  { id: 'songpa-raemian-estium', name: '래미안에스티움', district: '송파구', size: '34평', basePrice: 18, tier: '24', naverComplexId: '109434' },
  { id: 'songpa-raemian-parkpalace', name: '송파 래미안파크팰리스', district: '송파구', size: '24평', basePrice: 20.5, tier: '24', naverComplexId: '22809' },
  { id: 'songpa-jamsil-olympic-ipk', name: '잠실올림픽공원아이파크', district: '송파구', size: '24평', basePrice: 22.9, tier: '24', naverComplexId: '115046' },
  { id: 'songpa-hillstate-epyeon-munjeong', name: '힐스테이트e편한세상 문정', district: '송파구', size: '24평', basePrice: 22, tier: '24', naverComplexId: '166537' },
  { id: 'songpa-arteon', name: '아르테온', district: '송파구', size: '24평', basePrice: 20, tier: '24', naverComplexId: '119341' },
  { id: 'songpa-centras', name: '센트라스', district: '송파구', size: '24평', basePrice: 20, tier: '24', naverComplexId: '109910' },

  // ========== 티어 28 (매매가 28억 이하) ==========

  // 송파구
  { id: 'songpa-hanyang1', name: '송파동 한양1차', district: '송파구', size: '40평대', basePrice: 28, tier: '28', naverComplexId: '383' },
];
