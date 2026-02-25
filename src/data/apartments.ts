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
  { id: 'yeongdeungpo-dangsan-hangang', name: '당산동 한강', district: '영등포구', size: '24평', basePrice: 12.2, tier: '12', naverComplexId: '964' },

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
  { id: 'seongbuk-gileum-centerpiece', name: '길음 센터피스', district: '성북구', size: '24평', basePrice: 14, tier: '14', naverComplexId: '111330' },
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
  { id: 'dongdaemun-cheongnyangni-l65', name: '청량리 L65', district: '동대문구', size: '34평', basePrice: 18, tier: '20', naverComplexId: '127331' },

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

  // ========== 신규 추가 (티어 12) ==========

  // 서대문구
  { id: 'seodaemun-dmc-hanyang', name: 'DMC한양수자인', district: '서대문구', size: '34평', basePrice: 9.6, tier: '12', naverComplexId: '426' },
  { id: 'seodaemun-namgajwa-hyundai', name: '남가좌현대', district: '서대문구', size: '24평', basePrice: 8.3, tier: '12', naverComplexId: '848' },
  { id: 'seodaemun-central-ipk', name: '서대문센트럴아이파크', district: '서대문구', size: '24평', basePrice: 8.7, tier: '12', naverComplexId: '179137' },

  // 강북구
  { id: 'gangbuk-raemian-tribera', name: '래미안트리베라', district: '강북구', size: '24평', basePrice: 9.3, tier: '12', naverComplexId: '25971' },

  // 동대문구
  { id: 'dongdaemun-imun-hyundai', name: '이문현대', district: '동대문구', size: '34평', basePrice: 8.5, tier: '12', naverComplexId: '1125' },
  { id: 'dongdaemun-imun-daewoo', name: '이문대우', district: '동대문구', size: '34평', basePrice: 9.5, tier: '12', naverComplexId: '3374' },
  { id: 'dongdaemun-cheongsol-woosung', name: '청솔우성', district: '동대문구', size: '24평', basePrice: 9.2, tier: '12', naverComplexId: '3273' },
  { id: 'dongdaemun-cheonggye-hyundai', name: '청계현대', district: '동대문구', size: '24평', basePrice: 10, tier: '12', naverComplexId: '877' },

  // 구로구
  { id: 'guro-sindorim-lotte', name: '신도림롯데', district: '구로구', size: '24평', basePrice: 9.5, tier: '12', naverComplexId: '132' },
  { id: 'guro-gaebong-hyundai1', name: '개봉현대1차', district: '구로구', size: '34평', basePrice: 8.3, tier: '12', naverComplexId: '3349' },
  { id: 'guro-gaebong-prugio', name: '개봉푸르지오', district: '구로구', size: '29평', basePrice: 8.7, tier: '12', naverComplexId: '104934' },
  { id: 'guro-gaebong-hanmaeul', name: '개봉한마을', district: '구로구', size: '34평', basePrice: 9, tier: '12', naverComplexId: '106' },

  // 은평구
  { id: 'eunpyeong-bulgwang-misung', name: '불광미성', district: '은평구', size: '26평', basePrice: 7.3, tier: '12', naverComplexId: '780' },
  { id: 'eunpyeong-bulgwang-lotte', name: '불광롯데캐슬', district: '은평구', size: '24평', basePrice: 9.9, tier: '12', naverComplexId: '103025' },
  { id: 'eunpyeong-bukhansan-hyundai', name: '북한산현대홈타운', district: '은평구', size: '34평', basePrice: 9.7, tier: '12', naverComplexId: '9239' },
  { id: 'eunpyeong-nokbeon-daelim', name: '녹번대림이편한', district: '은평구', size: '34평', basePrice: 7.5, tier: '12', naverComplexId: '778' },
  { id: 'eunpyeong-hongeun-byuksan', name: '홍은벽산', district: '은평구', size: '34평', basePrice: 7.5, tier: '12', naverComplexId: '432' },
  { id: 'eunpyeong-hongjewon-hs', name: '홍제원힐스테이트', district: '은평구', size: '24평', basePrice: 9.5, tier: '12', naverComplexId: '26841' },
  { id: 'eunpyeong-baekryunsan-hills', name: '백련산힐스테이트', district: '은평구', size: '24평', basePrice: 8, tier: '12', naverComplexId: '27501' },
  { id: 'eunpyeong-baekryunsan-sk-ipk', name: '백련산SK뷰아이파크', district: '은평구', size: '24평', basePrice: 9.9, tier: '12', naverComplexId: '116158' },
  { id: 'eunpyeong-susaek-epyeon', name: '이편한수색에코', district: '은평구', size: '24평', basePrice: 6.4, tier: '12', naverComplexId: '3462' },
  { id: 'eunpyeong-dmc-lotte', name: 'DMC롯데캐슬더퍼스트', district: '은평구', size: '22평', basePrice: 9, tier: '12', naverComplexId: '118025' },

  // 마포구
  { id: 'mapo-sangam-worldcup9', name: '상암월드컵파크9단지', district: '마포구', size: '34평', basePrice: 9.8, tier: '12', naverComplexId: '101608' },
  { id: 'mapo-sangam-worldcup11', name: '상암월드컵파크11단지', district: '마포구', size: '34평', basePrice: 10, tier: '12', naverComplexId: '101610' },
  { id: 'mapo-sangam-worldcup12', name: '상암월드컵파크12단지', district: '마포구', size: '34평', basePrice: 10.5, tier: '12', naverComplexId: '101611' },

  // 노원구
  { id: 'nowon-mimisam', name: '미륭미성삼호3차', district: '노원구', size: '13평', basePrice: 8, tier: '12', naverComplexId: '219' },
  { id: 'nowon-wolgye-central-ipk', name: '월계센트럴아이파크', district: '노원구', size: '24평', basePrice: 9.8, tier: '12', naverComplexId: '117590' },
  { id: 'nowon-sanggye3', name: '상계주공3단지', district: '노원구', size: '17평', basePrice: 5.8, tier: '12', naverComplexId: '192' },
  { id: 'nowon-sanggye5', name: '상계주공5단지', district: '노원구', size: '17평', basePrice: 5.8, tier: '12', naverComplexId: '919' },
  { id: 'nowon-hanjin-granvil', name: '한진한화그랑빌', district: '노원구', size: '24평', basePrice: 9.5, tier: '12', naverComplexId: '3367' },

  // 강서구
  { id: 'gangseo-deungchon3', name: '등촌주공3단지', district: '강서구', size: '16평', basePrice: 9, tier: '12', naverComplexId: '12' },
  { id: 'gangseo-deungchon5', name: '등촌주공5단지', district: '강서구', size: '23평', basePrice: 9.2, tier: '12', naverComplexId: '13' },
  { id: 'gangseo-hwagok-prugio', name: '화곡푸르지오', district: '강서구', size: '24평', basePrice: 10, tier: '12', naverComplexId: '3330' },

  // ========== 신규 추가 (티어 14) ==========

  // 양천구
  { id: 'yangcheon-mokdong-lotte-maestro', name: '목동롯데캐슬마에스트로', district: '양천구', size: '24평', basePrice: 12.6, tier: '14', naverComplexId: '113008' },
  { id: 'yangcheon-mokdong-woosung2-42', name: '목동우성2차 42평', district: '양천구', size: '42평', basePrice: 13.5, tier: '14', naverComplexId: '8742' },

  // 송파구
  { id: 'songpa-sanga2', name: '상아2차', district: '송파구', size: '19평', basePrice: 13.5, tier: '14', naverComplexId: '628' },

  // 구로구
  { id: 'guro-sindorim-taeyoung', name: '신도림태영', district: '구로구', size: '34평', basePrice: 13, tier: '14', naverComplexId: '3204' },
  { id: 'guro-sindorim-daelim', name: '신도림대림', district: '구로구', size: '34평', basePrice: 14, tier: '14', naverComplexId: '3354' },
  { id: 'guro-sindorim-donga', name: '신도림동아', district: '구로구', size: '34평', basePrice: 14, tier: '14', naverComplexId: '1074' },

  // 동작구
  { id: 'dongjak-boramae-epyeon', name: '보라매이편한세상', district: '동작구', size: '34평', basePrice: 14, tier: '14', naverComplexId: '27576' },

  // ========== 신규 추가 (티어 16) ==========

  // 강동구
  { id: 'gangdong-godeok-central-prugio', name: '고덕센트럴푸르지오', district: '강동구', size: '24평', basePrice: 15.3, tier: '16', naverComplexId: '117842' },
  { id: 'gangdong-godeok-lotte-bene', name: '고덕롯데캐슬베네루체', district: '강동구', size: '24평', basePrice: 16, tier: '16', naverComplexId: '117309' },

  // 영등포구
  { id: 'yeongdeungpo-epyeon-adelfore', name: '이편한영등포아델포레', district: '영등포구', size: '34평', basePrice: 15.4, tier: '16', naverComplexId: '120522' },

  // 강서구
  { id: 'gangseo-yeomchang-donga3', name: '염창동아3차', district: '강서구', size: '34평', basePrice: 15, tier: '16', naverComplexId: '870' },
  { id: 'gangseo-woojangsan-hs', name: '우장산힐스테이트', district: '강서구', size: '34평', basePrice: 15.3, tier: '16', naverComplexId: '11337' },

  // 양천구
  { id: 'yangcheon-raemian-adeliche', name: '래미안목동아델리체', district: '양천구', size: '24평', basePrice: 16, tier: '16', naverComplexId: '121979' },
  { id: 'yangcheon-mokdong-samsung2-34', name: '목동삼성래미안2차 34평', district: '양천구', size: '34평', basePrice: 16, tier: '16', naverComplexId: '3440' },

  // 서초구
  { id: 'seocho-hoban-summit', name: '호반써밋서초파크', district: '서초구', size: '21평', basePrice: 16, tier: '16', naverComplexId: '132779' },

  // 강남구
  { id: 'gangnam-jagok-hs', name: '강남자곡힐스테이트', district: '강남구', size: '24평', basePrice: 16, tier: '16', naverComplexId: '105735' },
  { id: 'gangnam-suseo-12', name: '수서1~2단지', district: '강남구', size: '17평', basePrice: 15.5, tier: '16', naverComplexId: '827' },
  { id: 'gangnam-daechi2', name: '대치2단지', district: '강남구', size: '14평', basePrice: 16, tier: '16', naverComplexId: '483' },

  // 송파구
  { id: 'songpa-garak-woosung1', name: '가락우성1차', district: '송파구', size: '18평', basePrice: 16, tier: '16', naverComplexId: '348' },

  // 동대문구
  { id: 'dongdaemun-cheongnyangni-hanyang', name: '청량리역한양수자인', district: '동대문구', size: '24평', basePrice: 16, tier: '16', naverComplexId: '125441' },
  { id: 'dongdaemun-lotte-noblesse', name: '롯데캐슬노블레스', district: '동대문구', size: '24평', basePrice: 16, tier: '16', naverComplexId: '111396' },
  { id: 'dongdaemun-hs-cheonggye', name: '힐스테이트청계', district: '동대문구', size: '24평', basePrice: 16, tier: '16', naverComplexId: '110935' },
  { id: 'dongdaemun-epyeon-cheonggye', name: '이편한세상청계센트럴포레', district: '동대문구', size: '24평', basePrice: 15, tier: '16', naverComplexId: '125111' },
  { id: 'dongdaemun-raemian-artrich', name: '래미안아트리치', district: '동대문구', size: '24평', basePrice: 16, tier: '16', naverComplexId: '114972' },

  // 성북구
  { id: 'seongbuk-bomun-ipk-zai', name: '보문아이파크자이', district: '성북구', size: '24평', basePrice: 15, tier: '16', naverComplexId: '109051' },

  // 중구
  { id: 'junggu-namsan-town', name: '남산타운', district: '중구', size: '24평', basePrice: 15, tier: '16', naverComplexId: '3833' },
  { id: 'junggu-yaksu-heights', name: '약수하이츠', district: '중구', size: '24평', basePrice: 15, tier: '16', naverComplexId: '1238' },

  // ========== 신규 추가 (티어 20) ==========

  // 동대문구
  { id: 'dongdaemun-raemian-lagrande', name: '래미안라그란데', district: '동대문구', size: '24평', basePrice: 17, tier: '20', naverComplexId: '163360' },

  // 성동구
  { id: 'seongdong-raemian-midcounty', name: '래미안미드카운티', district: '성동구', size: '24평', basePrice: 19, tier: '20', naverComplexId: '111223' },
  { id: 'seongdong-kumho-daewoo', name: '금호대우', district: '성동구', size: '24평', basePrice: 19, tier: '20', naverComplexId: '2975' },
  { id: 'seongdong-haengdang-hanjin', name: '행당한진대림', district: '성동구', size: '24평', basePrice: 19, tier: '20', naverComplexId: '878' },
  { id: 'seongdong-seoulforest-hanshin', name: '서울숲한신더휴대림강변', district: '성동구', size: '24평', basePrice: 19, tier: '20', naverComplexId: '2977' },
  { id: 'seongdong-hyundai-prime', name: '현대프라임', district: '성동구', size: '24평', basePrice: 19, tier: '20', naverComplexId: '84' },

  // 서초구
  { id: 'seocho-hills', name: '서초힐스', district: '서초구', size: '24평', basePrice: 19, tier: '20', naverComplexId: '103577' },

  // 강남구
  { id: 'gangnam-desiang-park', name: '강남데시앙파크', district: '강남구', size: '34평', basePrice: 17, tier: '20', naverComplexId: '103252' },
  { id: 'gangnam-sindonga-famile', name: '강남신동아파밀리에', district: '강남구', size: '24평', basePrice: 16.5, tier: '20', naverComplexId: '102668' },
  { id: 'gangnam-segok-prugio', name: '세곡푸르지오', district: '강남구', size: '24평', basePrice: 18, tier: '20', naverComplexId: '103578' },
  { id: 'gangnam-jagok-ipk', name: '강남자곡아이파크', district: '강남구', size: '24평', basePrice: 20, tier: '20', naverComplexId: '113680' },
  { id: 'gangnam-suseo-kkachi', name: '수서까치마을', district: '강남구', size: '17평', basePrice: 17, tier: '20', naverComplexId: '641' },
  { id: 'gangnam-suseo-sindonga', name: '수서신동아', district: '강남구', size: '16평', basePrice: 19, tier: '20', naverComplexId: '671' },

  // 양천구
  { id: 'yangcheon-mokdong-hs', name: '목동힐스테이트', district: '양천구', size: '24평', basePrice: 18.7, tier: '20', naverComplexId: '108438' },
  { id: 'yangcheon-mokdong-park-zai', name: '목동파크자이', district: '양천구', size: '34평', basePrice: 19.9, tier: '20', naverComplexId: '115706' },
  { id: 'yangcheon-mokdong-lotte-winner-52', name: '목동롯데캐슬위너 52평', district: '양천구', size: '52평', basePrice: 19, tier: '20', naverComplexId: '10307' },

  // 영등포구
  { id: 'yeongdeungpo-singil-newtown', name: '신길뉴타운', district: '영등포구', size: '34평', basePrice: 19, tier: '20', naverComplexId: '115547' },
  { id: 'yeongdeungpo-munrae-hs', name: '문래힐스테이트', district: '영등포구', size: '45평', basePrice: 18.5, tier: '20', naverComplexId: '3450' },
  { id: 'yeongdeungpo-gangbyun-raemian', name: '강변래미안', district: '영등포구', size: '23평', basePrice: 16.1, tier: '20', naverComplexId: '2982' },
  { id: 'yeongdeungpo-dangsan-hyundai5', name: '당산현대5차', district: '영등포구', size: '24평', basePrice: 16.5, tier: '20', naverComplexId: '1210' },

  // 동작구
  { id: 'dongjak-sadang-woosung', name: '사당우성', district: '동작구', size: '23평', basePrice: 16.8, tier: '20', naverComplexId: '380' },
  { id: 'dongjak-isu-riga', name: '이수역리가', district: '동작구', size: '34평', basePrice: 18.4, tier: '20', naverComplexId: '102715' },
  { id: 'dongjak-sangdo-thesharp1', name: '상도더샵1차', district: '동작구', size: '24평', basePrice: 17.5, tier: '20', naverComplexId: '22789' },
  { id: 'dongjak-sindonga-riverpark', name: '신동아리버파크', district: '동작구', size: '43평', basePrice: 18, tier: '20', naverComplexId: '3280' },

  // 송파구
  { id: 'songpa-reminisce', name: '송파레미니스', district: '송파구', size: '24평', basePrice: 17.9, tier: '20', naverComplexId: '115869' },
  { id: 'songpa-epyeon-parkcentral', name: '이편한세상송파파크센트럴', district: '송파구', size: '24평', basePrice: 18, tier: '20', naverComplexId: '119875' },
  { id: 'songpa-geoyeo2', name: '거여2단지', district: '송파구', size: '37평', basePrice: 17, tier: '20', naverComplexId: '353' },
  { id: 'songpa-garak-ssangyong1', name: '가락쌍용1차', district: '송파구', size: '24평', basePrice: 19.3, tier: '20', naverComplexId: '598' },
  { id: 'songpa-pine', name: '송파파인', district: '송파구', size: '34평', basePrice: 19.5, tier: '20', naverComplexId: '100455' },

  // 강동구
  { id: 'gangdong-godeok-punggyeong', name: '고덕풍경채어바니티', district: '강동구', size: '34평', basePrice: 17, tier: '20', naverComplexId: '140148' },
  { id: 'gangdong-godeok-central-ipk', name: '고덕센트럴아이파크', district: '강동구', size: '24평', basePrice: 16.8, tier: '20', naverComplexId: '118210' },
  { id: 'gangdong-samik-green2', name: '삼익그린맨션2차', district: '강동구', size: '24평', basePrice: 18, tier: '20', naverComplexId: '1308' },
  { id: 'gangdong-godeok-jugong9', name: '고덕주공9단지', district: '강동구', size: '31평', basePrice: 19, tier: '20', naverComplexId: '1314' },
  { id: 'gangdong-lotte-first', name: '강동롯데캐슬퍼스트', district: '강동구', size: '24평', basePrice: 17, tier: '20', naverComplexId: '22570' },
  { id: 'gangdong-heritage-zai', name: '강동헤리티지자이', district: '강동구', size: '24평', basePrice: 18, tier: '20', naverComplexId: '154118' },
  { id: 'gangdong-gs-zai', name: 'GS강동자이', district: '강동구', size: '34평', basePrice: 16.2, tier: '20', naverComplexId: '8755' },
  { id: 'gangdong-dunchon-prugio', name: '둔촌푸르지오', district: '강동구', size: '34평', basePrice: 16.9, tier: '20', naverComplexId: '27212' },
  { id: 'gangdong-godeok-arteon', name: '고덕아르테온', district: '강동구', size: '24평', basePrice: 19.4, tier: '20', naverComplexId: '119341' },
  { id: 'gangdong-seonsa-hyundai-31', name: '선사현대 31평', district: '강동구', size: '31평', basePrice: 17, tier: '20', naverComplexId: '3118' },

  // 용산구
  { id: 'yongsan-riverhill-samsung', name: '리버힐삼성', district: '용산구', size: '34평', basePrice: 19, tier: '20', naverComplexId: '3803' },

  // 마포구
  { id: 'mapo-dowon-samsung', name: '도원삼성', district: '마포구', size: '34평', basePrice: 19, tier: '20', naverComplexId: '3459' },

  // ========== 신규 추가 (티어 24) ==========

  // 강남구
  { id: 'gangnam-samik-daecheong', name: '삼익대청', district: '강남구', size: '17평', basePrice: 20.9, tier: '24' },

  // 서초구
  { id: 'seocho-imgwang3', name: '임광3차', district: '서초구', size: '26평', basePrice: 23, tier: '24', naverComplexId: '474' },

  // 동작구
  { id: 'dongjak-sadang-daelim', name: '사당대림', district: '동작구', size: '43평', basePrice: 21, tier: '24', naverComplexId: '375' },

  // 송파구
  { id: 'songpa-parkhabio-prugio', name: '송파파크하비오푸르지오', district: '송파구', size: '34평', basePrice: 21, tier: '24', naverComplexId: '107544' },
  { id: 'songpa-samsung-raemian', name: '송파삼성래미안', district: '송파구', size: '43평', basePrice: 24, tier: '24', naverComplexId: '3431' },

  // 강동구
  { id: 'gangdong-myungil-sindonga', name: '명일신동아', district: '강동구', size: '30평', basePrice: 21, tier: '24', naverComplexId: '1312' },

  // 양천구
  { id: 'yangcheon-mokdong1', name: '목동신시가지1단지', district: '양천구', size: '24평', basePrice: 22, tier: '24', naverComplexId: '652' },
  { id: 'yangcheon-mokdong4', name: '목동신시가지4단지', district: '양천구', size: '24평', basePrice: 22, tier: '24', naverComplexId: '655' },
  { id: 'yangcheon-mokdong8', name: '목동신시가지8단지', district: '양천구', size: '24평', basePrice: 22, tier: '24', naverComplexId: '440' },
  { id: 'yangcheon-mokdong11', name: '목동신시가지11단지', district: '양천구', size: '24평', basePrice: 22, tier: '24', naverComplexId: '22959' },
  { id: 'yangcheon-mokdong12', name: '목동신시가지12단지', district: '양천구', size: '24평', basePrice: 22, tier: '24', naverComplexId: '666' },

  // 마포구
  { id: 'mapo-zai-centridge', name: '마포자이더센트리지', district: '마포구', size: '24평', basePrice: 23, tier: '24', naverComplexId: '111249' },

  // 성동구
  { id: 'seongdong-raemian-oksu', name: '래미안옥수리버젠', district: '성동구', size: '24평', basePrice: 23, tier: '24', naverComplexId: '100692' },

  // ========== 신규 추가 (티어 28) ==========

  // 강남구
  { id: 'gangnam-desiang-fore', name: '강남데시앙포레', district: '강남구', size: '24평', basePrice: 25, tier: '28', naverComplexId: '107799' },
  { id: 'gangnam-purunmaeul', name: '푸른마을', district: '강남구', size: '24평', basePrice: 25, tier: '28', naverComplexId: '9040' },
  { id: 'gangnam-suseo-samsung', name: '수서삼성', district: '강남구', size: '34평', basePrice: 28, tier: '28', naverComplexId: '8203' },
  { id: 'gangnam-raemian-blestij', name: '래미안블레스티지', district: '강남구', size: '20평', basePrice: 26, tier: '28', naverComplexId: '112228' },
  { id: 'gangnam-cheongdam-zai', name: '청담자이', district: '강남구', size: '21평', basePrice: 28, tier: '28', naverComplexId: '1081' },

  // 송파구
  { id: 'songpa-lake-palace', name: '레이크팰리스', district: '송파구', size: '24평', basePrice: 28, tier: '28', naverComplexId: '15011' },
  { id: 'songpa-jamsil-woosung4', name: '잠실우성4차', district: '송파구', size: '31평', basePrice: 27, tier: '28', naverComplexId: '637' },
  { id: 'songpa-helio-city', name: '헬리오시티', district: '송파구', size: '24평', basePrice: 28, tier: '28', naverComplexId: '111515' },
  { id: 'songpa-raemian-pinetop', name: '래미안송파파인탑', district: '송파구', size: '35평', basePrice: 26, tier: '28', naverComplexId: '103139' },

  // 강동구
  { id: 'gangdong-olympic-foreon', name: '올림픽파크포레온', district: '강동구', size: '24평', basePrice: 28, tier: '28', naverComplexId: '155817' },

  // 용산구
  { id: 'yongsan-gangchon', name: '강촌', district: '용산구', size: '24평', basePrice: 27, tier: '28', naverComplexId: '761' },
  { id: 'yongsan-ichon-coolong', name: '이촌코오롱', district: '용산구', size: '34평', basePrice: 26, tier: '28', naverComplexId: '892' },
  { id: 'yongsan-hangaram', name: '한가람', district: '용산구', size: '24평', basePrice: 26, tier: '28', naverComplexId: '867' },
  { id: 'yongsan-hyundai-hangang', name: '현대한강', district: '용산구', size: '34평', basePrice: 27.8, tier: '28', naverComplexId: '3811' },

  // 마포구
  { id: 'mapo-zai-2nd', name: '마포자이2차', district: '마포구', size: '34평', basePrice: 28, tier: '28', naverComplexId: '103674' },

  // 종로구
  { id: 'jongno-gyeonghuigung-zai', name: '경희궁자이', district: '종로구', size: '24평', basePrice: 24.5, tier: '28', naverComplexId: '109379' },

  // 성동구
  { id: 'seongdong-epyeon-oksu', name: '이편한옥수파크힐스', district: '성동구', size: '24평', basePrice: 24.5, tier: '28', naverComplexId: '110938' },
  { id: 'seongdong-hs-seoulforest-river', name: '힐스테이트서울숲리버', district: '성동구', size: '34평', basePrice: 25, tier: '28', naverComplexId: '110939' },

  // ========== 티어 32 (매매가 32억 이하) ==========

  // 송파구
  { id: 'songpa-parkrio', name: '파크리오', district: '송파구', size: '24평', basePrice: 28.5, tier: '32', naverComplexId: '22675' },
  { id: 'songpa-els', name: '잠실엘스', district: '송파구', size: '24평', basePrice: 31, tier: '32', naverComplexId: '22627' },
  { id: 'songpa-trizium', name: '트리지움', district: '송파구', size: '24평', basePrice: 29.5, tier: '32', naverComplexId: '19127' },
  { id: 'songpa-olympic-family', name: '올림픽훼미리', district: '송파구', size: '34평', basePrice: 28.5, tier: '32', naverComplexId: '610' },
  { id: 'songpa-ogeum-hyundai', name: '오금현대', district: '송파구', size: '46평', basePrice: 29.5, tier: '32', naverComplexId: '632' },

  // 강남구
  { id: 'gangnam-gaepo-raemian-forest', name: '개포래미안포레스트', district: '강남구', size: '24평', basePrice: 29.5, tier: '32', naverComplexId: '119219' },
  { id: 'gangnam-daechi-samsung1', name: '대치삼성1차', district: '강남구', size: '24평', basePrice: 28.5, tier: '32', naverComplexId: '135' },
  { id: 'gangnam-yeoksam-raemian', name: '역삼래미안', district: '강남구', size: '24평', basePrice: 29.8, tier: '32', naverComplexId: '13814' },

  // 용산구
  { id: 'yongsan-hangang-daewoo', name: '한강대우', district: '용산구', size: '34평', basePrice: 28.4, tier: '32', naverComplexId: '767' },

  // 마포구
  { id: 'mapo-epyeon-riverpark', name: '이편한세상마포리버파크', district: '마포구', size: '34평', basePrice: 30, tier: '32', naverComplexId: '105738' },

  // 성동구
  { id: 'seongdong-seoulforest-riverview-zai', name: '서울숲리버뷰자이', district: '성동구', size: '34평', basePrice: 28.5, tier: '32', naverComplexId: '111258' },
  { id: 'seongdong-hannam-heights', name: '한남하이츠', district: '성동구', size: '28평', basePrice: 28.5, tier: '32', naverComplexId: '566' },

  // ========== 티어 50 (매매가 32억 초과 프리미엄) ==========

  // 강남구
  { id: 'gangnam-sangnoksu', name: '상록수', district: '강남구', size: '34평', basePrice: 33, tier: '50', naverComplexId: '5760' },

  // 영등포구
  { id: 'yeongdeungpo-yeouido-misung', name: '여의도미성', district: '영등포구', size: '32평', basePrice: 32.5, tier: '50', naverComplexId: '744' },
  { id: 'yeongdeungpo-yeouido-sibum', name: '여의도시범', district: '영등포구', size: '47평', basePrice: 46, tier: '50', naverComplexId: '749' },
];
