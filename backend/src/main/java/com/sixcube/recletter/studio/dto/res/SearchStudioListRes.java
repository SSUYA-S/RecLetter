package com.sixcube.recletter.studio.dto.res;

import com.sixcube.recletter.studio.dto.StudioInfo;
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
public class SearchStudioListRes {
  private List<StudioInfo> studioInfoList;
}
