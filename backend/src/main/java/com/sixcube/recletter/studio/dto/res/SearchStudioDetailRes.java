package com.sixcube.recletter.studio.dto.res;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SearchStudioDetailRes {
  private Integer studioId;
  private String studioTitle;
  private Boolean isCompleted;
  private String studioOwner;
//  private List<ClipInfo> clipInfoList;
  private Integer studioFrameId;
  private Integer studioFontId;
  private Integer studioBgmId;
}