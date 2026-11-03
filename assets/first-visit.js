export const TUTORIAL_SEEN_KEY='byeoljup-tutorial-seen-v1';
export const shouldShowTutorial=({seen=false,user=false,forced=false,recovery=false}={})=>forced||recovery||(!seen&&!user);
export function hasSeenTutorial(){try{return localStorage.getItem(TUTORIAL_SEEN_KEY)==='1'}catch{return false}}
export function rememberTutorial(){try{localStorage.setItem(TUTORIAL_SEEN_KEY,'1')}catch{}}
