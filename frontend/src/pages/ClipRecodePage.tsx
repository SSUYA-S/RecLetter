import {useState, useEffect, useRef, BaseSyntheticEvent} from 'react';
import { ClipInfo } from '../types/type';
import MyClipCard from '../components/MyClipCard';
import getBlobDuration from 'get-blob-duration';
import DeleteCheckWindow from '../components/DeleteCheckWindow';

interface Const {
    audio: boolean,
    video: boolean
}

export default function ClipRecodePage() {
    //모드 0:영상, 1:스크립트
    const [mode, setMode] = useState<number>(0);

    const [isRecording, setIsRecording] = useState<boolean>(false);

    const [myClipList, setMyClipList] = useState<ClipInfo[]>([]);

    //스크립트 선택된 것
    const [selectedScript, setSelectedScript] = useState<string>("");
    const scriptRef = useRef<HTMLTextAreaElement>(null);

    /**handleScript()
     * 사이드바 textarea에 작성한 script를 중앙 상단의 출력창에 바인딩한다.
     */
    const handleScript = () => {
        if(scriptRef.current){
            setSelectedScript(scriptRef.current.value);
        }
    }

    //유저 아이디, 닉네임 불러오기
    const userId : string|null = localStorage.getItem("userId")
    const usernickname : string|null = localStorage.getItem("usernickname")

    //url로부터 스튜디오 제목 불러오기
    const studioTitle : string|null = new URLSearchParams(location.search).get("title");

    //영상 번호
    let clipNumber : number = myClipList.length;



////////////////////////타이머 기능///////////////////////////////////////////////////////
    const timer = useRef<number | null| NodeJS.Timeout>(null);
    const [nowTime, setNowTime] = useState<number>(0);

    /**handltTimerStart()
     * 영상 촬영 시 사용하는 타이머를 시작한다.
     * 1초에 nowTime이 1씩 증가한다.
     */
    const handleTimerStart = () => {
        timer.current = setInterval(() => {
            setNowTime((prev) => prev + 1);
        }, 1000)
    }

    /**handleTimerEnd()
     * 영상 촬영을 끝냈을 때 타이머를 끝낸다.
     * nowTime을 초기화하고, timer설정을 clear한다.
     */
    const handleTimerEnd = () => {
        if(timer.current){
            setNowTime(0);
            clearInterval(timer.current);
        }
    }
///////////////////////타이머 기능 종료///////////////////////////////////////////////////



/////////웹캠 구간////////////////////////////////////////////////////////////
    
    //미디어스트림 저장 변수
    const defaultMS = new MediaStream();

    const [mS, setMS] = useState<MediaStream>(defaultMS);

    //미디어레코더 저장 변수
    const defaultMrecorder = new MediaRecorder(defaultMS, {
        mimeType: "video/webm; codecs=vp9"
    });

    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>(defaultMrecorder);

    

    // 비디오 미리보기 ref
    const videoOutputRef = useRef<HTMLVideoElement>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);

    //영상 권한
    const constraints : Const = {audio: true, video: true};
    /**useEffect를 이용한 촬영 준비 설정
     * 오디오, 비디오 권한을 받아, 허가를 얻으면 mediaStream을 얻는다.
     * 해당 스트림을 비디오 녹화 화면(videoOutputRef)와 연결하여 현재 웹캠으로 촬영되는 화면의 미리보기를 실행한다.
     */
    useEffect(() => {
        //웹캠 영상 미리보기
        navigator.mediaDevices.getUserMedia(constraints)
        .then((mediaStream) => {
            if(videoOutputRef.current !== null){
                //촬영되는 화면 미리보기 코드
                videoOutputRef.current.srcObject = mediaStream;
                
                videoOutputRef.current.onloadedmetadata = () => {
                    if(videoOutputRef.current !== null){
                        videoOutputRef.current.play();
                    }
                }
                //촬영되는 화면 미리보기 코드끝
                setMS(mediaStream);
            }
        })
    }, [])
    
    /**startRecord()
     * 영상 녹화시작 함수
     * 영상 녹화를 시작한다. 녹화 버튼을 누르면 실행되는 함수다.
     * MediaRecorder를 불러와 webm형태의 비디오를 스트림 받는다.
     * 데이터를 전달 받으면 mediaData라는 Blob배열에 저장한다.
     * 녹화 중지 시, blob 정보가 저장된 url을 생성하고, 촬영한 영상을 띄운다.
     * 타이머를 중지한다.
     */
    const startRecord = () => {
        const mediaData : Blob[] = [];

        //MediaRecorder 생성자 호출, webm형식 저장
        const newMediaRecorder = new MediaRecorder(mS, {
            mimeType: "video/webm; codecs=vp9"
        });


        //전달받은 데이터 등록
        newMediaRecorder.ondataavailable = (event) => {
            if(event.data && event.data.size > 0){
                mediaData.push(event.data);
            }
        }
        
        //녹화 중지 시
        newMediaRecorder.onstop = () => {
            setIsRecording(false);
            clipNumber++;//클립번호 추가
            async function getBlobInfo() {
                const blob = new Blob(mediaData, {type: "video/webm; codecs=vp9"});
                const newURL : string = URL.createObjectURL(blob);
                const recording = videoOutputRef.current;
                const preview = videoPreviewRef.current;
                if(recording && preview){ 
                    preview.src = newURL;               
                    preview.style.display = 'block';
                    recording.style.display = 'none';
                }
                

                const duration = await getBlobDuration(newURL);
                //새 클립 정보 생성
                if(userId){
                    const newClip : ClipInfo = {
                        clipId: clipNumber,
                        clipTitle: usernickname + " " + clipNumber,
                        clipOwner: userId,
                        clipLength: Math.floor(duration),
                        clipThumbnail: "/src/assets/images/nothumb.png",
                        clipUrl: newURL,
                        clipOrder: 0,
                        clipVolume: 50,
                    }
                    
                    const newArray = [...myClipList, newClip];
                    setMyClipList(newArray)
                }
            }
            getBlobInfo();
            handleTimerEnd();
        }
        

        
        //녹화 시작
        newMediaRecorder.start();
        setMediaRecorder(newMediaRecorder);
        //녹화 표시, 화면 전환, 타이머 시작
        setIsRecording(true);
        handleRecordMode();
        handleTimerStart();
    }

    /**endRecord()
     * 영상 녹화를 끝낸다. mediaRecorder를 멈춰 먼저 정의되어 있던 프로세스를 수행한다.
     */
    const endRecord = () => {
        if(mediaRecorder) {
          mediaRecorder.stop();
        }
      }


    /**handleRecordMode()
     * 저장된 영상들을 보다가 웹캠 녹화 화면으로 이동을 원할 때 사용한다.
     * 사이드바의 영상 촬영하기 버튼을 누르면 나온다.
     * 촬영된 비디오 보기(videoPreviewRef)를 안보이게, 웹캠 화면(videoOutputRef)을 보이게 설정한다.
     */
    const handleRecordMode = () => {
        pauseVideo();
        if(videoOutputRef.current && videoPreviewRef.current){
            videoPreviewRef.current.style.display = 'none';
            videoOutputRef.current.style.display = 'block';
        }
    }

    
    
////////////웹캠 구간 종료////////////////////////////////////////////////////////////////////////////////

////////////////////영상 리스트 기능////////////////////////////////////////////////////////////////////////


    /**onLinkClick()
     * 사이드바에서 클릭한 영상을 화면에 보여준다.
     * @param clipId 
     * clipId는 현재 선택한 클립의 번호다.
     */
    const onLinkClick = (clipId: number) => {
        const clip = myClipList.filter((prev) => clipId === prev.clipId);

        const recording = videoOutputRef.current;
        const preview = videoPreviewRef.current;
        if(recording && preview){ 
            preview.src = clip[0].clipUrl;               
            preview.style.display = 'block';
            recording.style.display = 'none';
        }
    }

    /**changeMode()
     * 사이드바 조종 함수
     * 사이드바에 영상리스트, 스크립트 중 하나를 선택하도록 만든다.
     * @param mode 
     * 0: 영상 리스트, 1: 스크립트
     */
    const changeMode = (mode: number) => {
        setMode(mode);
    }


    //삭제 모달 관련 state
    const [isDeleting, setIsDeleting] = useState<boolean>(false); //삭제확인창 띄우기 여부
    const [deleteStateId, setDeleteStateId] = useState<number>(-1); //삭제하는 요소의 id

    /**onPressDelete(clipId : number)
     * 영상 리스트에서 영상 삭제를 누르면 나온다.
     * 영상 삭제 창을 활성화시킨다.
     * @param clipId 
     * 클립의 고유 id다. 이 id를 지울것이라 설정한다.
     */
    const onPressDelete = (clipId: number) => {
        setIsDeleting(true);
        setDeleteStateId(clipId);
    }

    /**chooseDelete()
     * 삭제 확인창에서 삭제를 눌렀을 때 호출되는 함수다.
     * 호출 시, 해당 요소를 myClipList에서 삭제한다. 그리고 삭제 확인 창을 닫늗다.
     */
    const chooseDelete = () => {
        setMyClipList((prevList) => {
            for(let i = 0; i < prevList.length; i++){
                if(prevList[i].clipId === deleteStateId){
                    prevList.splice(i, 1);
                    break;
                }
            }
            const newList: ClipInfo[] = [...prevList];
            return newList;
        })

        //삭제 여부 초기화
        setDeleteStateId(-1);
        setIsDeleting(false);
    }

    /**chooseNotDelete()
     * 삭제 취소를 선택하면 나오는 창이다.
     * 삭제 확인 창을 닫기만 한다.
     */
    const chooseNotDelete = () => {
        setDeleteStateId(-1);
        setIsDeleting(false);
    }



    //클립 이름 변경 관련 state
    const [changingName, setChangingName] = useState<string>('');

    /**onNameChange(clipId : number)
     * 클립의 이름 변경을 완료하면 호출되는 함수다.
     * 입력된 이름으로 해당 클립의 이름을 바꾼다.
     * @param clipId 
     * 클립의 고유 id다.
     */
    const onNameChange = (clipId : number) => {
        //현재 변경중인 이름 요소 찾아 변경
        setMyClipList((prevList) => {
            for(let i = 0; i < prevList.length; i++){
                if(prevList[i].clipId === clipId){
                    prevList[i].clipTitle = changingName;
                    break;
                }
            }
            const newList: ClipInfo[] = [...prevList];
            return newList;
        })
    }

/////////////////////////영상리스트 기능 종료//////////////////////////////////////////////

///영상 60초 제한///////////////////////////////////////////////////////////////////////
if(nowTime >= 60){
    endRecord();
}


///영상 재생//////////////////////////////////////////////////////////////////////////////

/** playVideo()
 * 영상 재생 버튼을 누르면 나오는 함수다.
 * 클립 리스트에 있는 영상 중, 선택한 영상, 또는 최근에 감상한 영상을 재생한다.
 */
const playVideo = () => {
    //영상 재생 화면 띄우기
    const recording = videoOutputRef.current;
    const preview = videoPreviewRef.current;
    if(recording && preview && preview.style.display === 'none'){               
        preview.style.display = 'block';
        recording.style.display = 'none';
    }
    //영상재생
    if(preview){
        preview.play();
    }
}


/** pauseVideo()
 * 일시정지 버튼을 누르면 호출되는 함수다.
 * 영상 재생이 일시정지된다.
 */
const pauseVideo = () => {
    const preview = videoPreviewRef.current;
    if(preview){
        preview.pause();
    }
}

//프로그레스 바의 현재 상태를 위한 state다.
const [progress, setProgress] = useState(0);

/**handleProgress(event)
 * 프로그레스 바와 영상을 동기화한다.
 * @param event 
 * 영상이 재생되는 이벤트다.
 * @returns 
 * 영상이 만들어진 직후에는 이 값이 없다. 그래서 그냥 생략한다.
 */
const handleProgress = (event : BaseSyntheticEvent) => {
    if(isNaN(event.target.duration)){ return ;}
    else {
        setProgress((event.target.currentTime / event.target.duration) * 100)
    }
}




///////////////////////////////렌더링 화면//////////////////////////////////////////
    return (
        <section className="relative section-top">
            {/* 상단바 */}
            <div className="h-20 w-full px-12 color-text-black flex justify-between items-center">
                <div className="flex items-center">
                    <span className="material-symbols-outlined">
                        arrow_back_ios
                    </span>
                    <p className="text-3xl">{studioTitle}</p>
                    <div className="ml-20" />
                    <p>2024-01-14-02:12AM</p>
                </div>
                <a
                    href="/clipedit"
                    className="btn-cover color-bg-blue3 text-white"
                >
                    편집하기
                </a>
            </div>

            {/* 중앙 섹션 */}
            <div className="flex w-full editor-height">
                {/* 삭제 확인 모달 */}
                {isDeleting ? <DeleteCheckWindow onClickOK={chooseDelete} onClickCancel={chooseNotDelete}/> : <></>}
                {/* 좌측부분 */}
                <div className="w-1/4 editor-height flex">
                    {/* 카테고리 */}
                    <div className="w-1/5 ">
                        <div className={`h-28 bg-orange-100 flex flex-col justify-center items-center ${mode === 0 ? "categori-selected" : ""}`} onClick={() => {changeMode(0)}}>
                            <span className="material-symbols-outlined text-3xl">
                                movie_edit
                            </span>
                            <p className="font-bold">영상</p>
                        </div>
                        <div className={`h-28 bg-orange-100 flex flex-col justify-center items-center ${mode === 1 ? "categori-selected" : ""}`} onClick={() => {changeMode(1)}}>
                            <span className="material-symbols-outlined text-3xl">
                                kid_star
                            </span>
                            <p className="font-bold">스크립트</p>
                        </div>
                    </div>
                    {/* 카테고리 선택에 따라 */}
                    {(mode === 0) ? 
                    <div className="w-4/5 flex flex-col items-center p-6 overflow-y-scroll">
                        <div className="w-full flex justify-start text-xl ">
                            <p>촬영한 영상</p>
                        </div>
                        {
                            myClipList.map((clip) => {
                                return <MyClipCard props={clip} 
                                key={clip.clipId} 
                                onClick={() => {onPressDelete(clip.clipId)}} 
                                onLinkClick={() => {onLinkClick(clip.clipId)}}
                                onNameChange={() => onNameChange(clip.clipId)}
                                setChangingName={setChangingName}
                                />
                            })
                        }
                        <button className='w-full text-xl bg-[#2C75E2] text-white rounded' onClick={handleRecordMode}>영상 촬영하기</button>
                    </div>
                    :
                    <div className="w-4/5 flex flex-col items-center p-6 overflow-y-scroll">
                        <div className="w-full flex justify-start text-xl ">
                            <p>스크립트</p>
                        </div>
                        <textarea ref={scriptRef} onChange={handleScript} rows={4} className='text-xl text-black w-full border-black border-solid border-2 rounded'></textarea>
                    </div>
                    }
                </div>
                {/* 우측부분 */}
                <div className="w-3/4 editor-height bg-gray-50 flex justify-between">
                    <div className="w-full px-4 py-4 flex flex-col justify-center items-center">
                        <div className="movie-width flex justify-start items-center mt-0">
                            <p className="text-2xl">{usernickname}</p>
                        </div>
                        <p className="my-3 py-3 rounded-full border-2 border-black movie-width text-center text-xl whitespace-pre-wrap">
                            {selectedScript}
                        </p>
                        {/*영상 촬영 화면*/}
                        <video
                            className="bg-white border my-2"
                            style={{ width: '640px', height: '480px', display: 'block' }}
                            ref={videoOutputRef}
                            muted
                        />
                        {/*영상 감상 화면*/}
                        <video
                            className="bg-white border my-2"
                            style={{ width: '640px', height: '480px', display: 'none' }}
                            ref={videoPreviewRef}
                            controls
                            onTimeUpdate={handleProgress}
                        />
                        <div className="w-full flex flex-col justify-center items-center my-4">
                            <div>
                                {/* 녹화중 아니면 재생 버튼, 녹화중에는 타이머 비활성화 */}
                                {!isRecording ?
                                <>
                                    <span className="material-symbols-outlined me-1 text-4xl cursor-pointer" onClick={playVideo}>
                                        play_circle
                                    </span>
                                    <span className="material-symbols-outlined me-1 text-4xl cursor-pointer" onClick={pauseVideo}>
                                        pause_circle
                                    </span>
                                </>                                    
                                :
                                <span className='me-1 text-4xl'>
                                    {Math.floor(nowTime/60)} : {nowTime >= 10 ? nowTime%60 : '0'+ nowTime%60} 
                                </span>
                                }
                                {/* 녹화중 아니면 녹화버튼, 녹화중이면 정지 버튼 */}
                                {
                                    !isRecording ? 
                                    <span className="material-symbols-outlined me-1 text-4xl color-text-red3 cursor-pointer" onClick={startRecord}>
                                    radio_button_checked
                                    </span>
                                    :
                                    <span className="material-symbols-outlined me-1 text-4xl cursor-pointer" onClick={endRecord}>
                                        stop_circle
                                    </span>
                                }
                                <span className={isRecording? 'text-red-500' : 'text-black'} >
                                    ON-AIR
                                </span>
                            </div>
                            {/* 프로그레스 바 */}
                            <progress id='progress' max={100} value={progress} className='w-full rounded -webkit-progress-bar:bg-black -webkit-progress-value:bg-red'>
                                Progress
                            </progress>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
