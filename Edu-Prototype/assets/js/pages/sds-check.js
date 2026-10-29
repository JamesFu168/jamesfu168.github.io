/* SDS 檢查（UI-08）：改用共用的 SdsCheckView（T14b）；展示假設 A-09 示範檢查規則。 */
$(document).on('app:ready', function () {
  'use strict';
  SdsCheckView.render($('#chk-view'));
});
