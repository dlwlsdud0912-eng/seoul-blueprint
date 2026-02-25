import { DistrictNote } from '@/types';

export const NOTES: DistrictNote[] = [
  // 티어 12
  { tier: '12', content: '지금 가장 핫한 동대문', district: '동대문구' },
  { tier: '12', content: '대형평수인데 가격이 좋지요', apartmentId: 'gwanak-naksungdae-hyundai' },

  // 티어 14
  { tier: '14', content: '용산에선 14억아래로는 여기가 마지노선', apartmentId: 'yongsan-hangangtown' },
  { tier: '14', content: '세대수는 461세대, 흐름 좋음', apartmentId: 'dongdaemun-dapsimni-parkzai-59' },
  { tier: '14', content: '재건축아파트라 10년묶임', apartmentId: 'songpa-parkdale2' },
  { tier: '14', content: '세대수 적은데 최근 물들어와서 호가 약 5천~씩은 오름', apartmentId: 'seongdong-seongsu-woobang2' },
  { tier: '14', content: '세대수는 작지만 흐름 좋음', apartmentId: 'dongdaemun-raemian-weave' },

  // 티어 14 - 길음 선호도
  {
    tier: '14',
    content:
      '요새 가장 핫한 길음, 안에서도 선호도가 나뉘는데\n(S) 클라시아, 센터피스\n(AAA) 래미안 6단지, 8단지(815동쪽)\n(AA) 8단지뒷동, 7단지, 9단지\n(A) 1단지 4단지\n(A-) 동부센트레빌 래미안 2단지',
    district: '성북구',
  },

  // 티어 16
  { tier: '16', content: '강래팰은 주복이라도 잘 오름 (토허제x 갭투도가능)', apartmentId: 'gangdong-raemian-palace' },
  { tier: '16', content: '이문신축들 따라 탄력받기 시작', district: '동대문구' },
  { tier: '16', content: '지금 아트자이 34평이 15.5~라서 84들어갈타이밍', apartmentId: 'yeongdeungpo-art-zai' },

  // 티어 20
  { tier: '20', content: '성산시영은 23평을 가장선호함', apartmentId: 'mapo-sungsan-siyoung' },
  { tier: '20', content: '주복이라도 잘오름', district: '마포구' },

  // 티어 24
  { tier: '24', content: '서울숲푸르지오는 2차를 더 선호합니다. 대형평은 1차', district: '성동구' },
];
