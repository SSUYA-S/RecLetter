import { OpenVidu, Session, Subscriber } from 'openvidu-browser';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getUser } from '../api/user';
import { UserInfo } from '../types/type';
import { connectSessionAPI } from '../api/openvidu';
import { useNavigate } from 'react-router-dom';
import OpenViduVideoCard from '../components/OpenViduVideoCard';
import { disconnect } from '../util/chat';

export default function LetterViewPage() {
    //navigate
    const navigate = useNavigate();

    //studioId 가져오기
    const splitUrl = document.location.href.split('/');
    const studioId = splitUrl[splitUrl.length - 1];

    //유저 정보
    const [userInfo, setUserInfo] = useState<UserInfo>({
        userId: '',
        userEmail: '',
        userNickname: '',
    });

    //+유저 정보 불러오기
    const getUserInfo = async () => {
        const resuser = await getUser();
        const tempObj = { ...resuser.data };
        setUserInfo({
            userId: tempObj.userId,
            userEmail: tempObj.userEmail,
            userNickname: tempObj.userNickname,
        });
    };

    /////////////////////////////openvidu///////////////////

    const [session, setSession] = useState<Session>();
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

    const OV = useRef(new OpenVidu());

    // const APPLICATION_SERVER_URL = 'https://demos.openvidu.io/';

    /** deleteSubscriber(deletedsub)
     * 연결이 끊긴 구독자를 삭제한다.
     */
    const deleteSubscriber = useCallback((deletedsub: Subscriber) => {
        setSubscribers((prev) => {
            return prev.filter((subscriber) => subscriber !== deletedsub);
        });
    }, []);

    /** startSession
     *  감상 화면에서 세션에 연결을 진행한다.
     *  세션id를 스튜디오id와 같게한 것을 기억하라
     */
    const startSession = useCallback(async () => {
        const newSession = OV.current.initSession();

        //동영상이 들어오고 있다.
        newSession.on('streamCreated', (event) => {
            //DOM 추가 없으니 두번째 인자는 undefined
            const subscriber = newSession.subscribe(event.stream, undefined);
            console.log('subcriber - ', subscriber);
            //subscribers 리스트에 추가
            setSubscribers((prevSubscribers) => [
                ...prevSubscribers,
                subscriber,
            ]);
        });

        //화면 공유 종료 시
        newSession.on('streamDestroyed', (event: any) => {
            console.log('stream Destoryed - ', event);
            deleteSubscriber(event.streamManager);
        });

        //에러 발생 시
        newSession.on('exception', (exception) => {
            console.warn(exception);
        });

        newSession.on('sessionDisconnected', () => {
            alert('session closed');
            endScreenShare();
        });

        // 세션 연결
        const token = await getToken(studioId); //토큰 받아오기

        // 세션 연결 시작
        newSession
            .connect(token, { clientData: userInfo.userId })
            .then(async () => {
                console.log('Connected to Session');
            })
            .catch((error) => {
                //connect에 에러
                console.log(
                    'There was an error connecting to the session:',
                    error.code,
                    error.message
                );
            });

        //세션 설정
        setSession(newSession);
    }, []);

    const endScreenShare = useCallback(() => {
        //세션이 있으면 연결을 멈춘다.
        if (session) {
            session.disconnect();
        }

        //OV 초기화
        OV.current = new OpenVidu();
        setSession(undefined);
        setSubscribers([]);

        //메인 페이지로
        navigate(`/studiomain/${studioId}`);
    }, []);

    /** getToken()
     * 세션을 생성하고 접속을 위한 토큰을 가져옵니다.
     */
    const getToken = async (studioId: string) => {
        //스튜디오 아이디를 세션 아이디와 같게 했으므로, 이를 이용해 토큰을 만든다.
        return await createToken(studioId);
    };

    /** createToken(sessionId)
     * 토큰을 생성한다.
     * @param sessionId
     * @returns
     */
    const createToken = async (sessionId: string) => {
        const response = await connectSessionAPI(sessionId);
        return response.data.token; // The token
    };

    //윈도우창 강제 종료 시 처리
    useEffect(() => {
        const handleBeforeUnload = () => endScreenShare();
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [endScreenShare]);

    //초기세팅
    useEffect(() => {
        const initSetting = async () => {
            await getUserInfo();
            await startSession();
        };
        initSetting();
        /** 페이지 새로고침 전에 실행 할 함수 */
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            disconnect();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            disconnect();
        };
    }, []);

    return (
        <section className="relative section-top pt-16">
            <h1>Welcome to Letter View Page</h1>
            <p>지금 다른 사람이 수정하고 있으니 쉬고 계세요.</p>
            <div id="video-container">
                {subscribers.length >= 1 ? (
                    subscribers.map((subscriber) => {
                        return (
                            <OpenViduVideoCard
                                key={subscriber.id}
                                streamManager={subscriber}
                            />
                        );
                    })
                ) : (
                    <></>
                )}
            </div>
        </section>
    );
}
