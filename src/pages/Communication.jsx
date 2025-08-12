// src/pages/Communication.jsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom'; // <-- ΝΕΑ ΕΙΣΑΓΩΓΗ
import {
    Box, Grid, Paper, Typography, List, Divider, ListSubheader,
    InputAdornment, IconButton, Container, TextField as MuiTextField,
    Avatar, Tooltip, Card, CardContent, ListItem, ListItemIcon, ListItemText,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, CircularProgress,
    ListItemButton, Collapse, Alert, colors, Link, Badge, ListItemAvatar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    Search as SearchIcon, Info as InfoIcon, ChevronRight as ChevronRightIcon, Campaign as CampaignIcon,
    People as PeopleIcon, Person as PersonIcon, Class as ClassIcon, Email as EmailIcon, Phone as PhoneIcon,
    PhotoCamera as PhotoCameraIcon, Delete as DeleteIcon, Send as SendIcon, ExpandLess, ExpandMore,
    AttachFile as AttachFileIcon, Reply as ReplyIcon, Close as CloseIcon, InsertDriveFile as FileIcon,
    Done as DoneIcon, DoneAll as DoneAllIcon, School as TeacherIcon // <-- ΝΕΑ ΕΙΣΑΓΩΓΗ
} from '@mui/icons-material';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, deleteField, writeBatch, arrayUnion, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, uploadBytes } from "firebase/storage";
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import { blue, green } from '@mui/material/colors';
import 'react-chat-elements/dist/main.css';
import { SystemMessage } from 'react-chat-elements';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// ... (Όλα τα helper components όπως StyledBadge, InfoCard, ReadReceipts, ChatMessage παραμένουν ίδια) ...
const StyledBadge = styled(Badge)(({ theme, isOnline }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: isOnline ? '#44b700' : theme.palette.action.disabled,
    color: isOnline ? '#44b700' : theme.palette.action.disabled,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: isOnline ? 'ripple 1.2s infinite ease-in-out' : 'none',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));
const InfoCard = ({ channel, student, classroom, enrolledStudents, onStudentClick, db, appId }) => {
    const fileInputRef = useRef(null);
    const imgRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [imageSrc, setImageSrc] = useState('');
    const [openCropModal, setOpenCropModal] = useState(false);
    const [originalFile, setOriginalFile] = useState(null);

    if (!channel) return null;

    let title = channel.title;
    let subtitle = channel.subtitle || '';
    let avatarIcon = <CampaignIcon sx={{ fontSize: 60 }} />;
    let detailsList = [];
    let profileImageUrl = '';
    const isUploadDisabled = channel.type === 'global' || isUploading;

    if (channel.type === 'personal' && student) {
        avatarIcon = <PersonIcon sx={{ fontSize: 60 }} />;
        profileImageUrl = student.profileImageUrl || '';
        detailsList = [
            { icon: <ClassIcon fontSize="small" />, label: 'Τάξη', value: student.grade || '-' },
            { icon: <EmailIcon fontSize="small" />, label: 'Email', value: student.email || '-' },
            { icon: <PhoneIcon fontSize="small" />, label: 'Τηλέφωνο', value: student.studentPhone || '-' },
        ];
    } else if (channel.type === 'classroom' && classroom) {
        avatarIcon = <PeopleIcon sx={{ fontSize: 60 }} />;
        profileImageUrl = classroom.profileImageUrl || '';
        title = classroom.classroomName;
        subtitle = classroom.subject;
        detailsList = [
            { icon: <ClassIcon fontSize="small" />, label: 'Μάθημα', value: classroom.subject },
            { icon: <PersonIcon fontSize="small" />, label: 'Καθηγητής', value: classroom.teacherName || '-' },
        ];
    }

    const handleCameraClick = () => {
        if (!isUploadDisabled) {
            fileInputRef.current.click();
        }
    };
    
    function onImageLoad(e) {
        imgRef.current = e.currentTarget;
        const { width, height } = e.currentTarget;
        const crop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
            width,
            height
        );
        setCrop(crop);
    }

    const handleFileSelect = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            setOriginalFile(file);
            setCrop(undefined);
            const reader = new FileReader();
            reader.addEventListener('load', () => setImageSrc(reader.result.toString() || ''));
            reader.readAsDataURL(file);
            setOpenCropModal(true);
            event.target.value = null;
        }
    };

    const handleSaveCrop = async () => {
        if (!completedCrop || !imgRef.current || !originalFile) {
            return;
        }

        const canvas = document.createElement('canvas');
        const image = imgRef.current;
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width,
            completedCrop.height
        );

        canvas.toBlob(async (blob) => {
            if (!blob) {
                console.error('Canvas is empty');
                return;
            }
            
            setOpenCropModal(false);
            setIsUploading(true);
            setUploadError('');

            const collectionName = channel.type === 'personal' ? 'students' : 'classrooms';
            const docId = channel.id;
            const storage = getStorage(db.app);
            const imagePath = `profileImages/${collectionName}/${docId}/${Date.now()}_${originalFile.name}`;
            const storageRef = ref(storage, imagePath);

            try {
                const snapshot = await uploadBytes(storageRef, blob);
                const downloadURL = await getDownloadURL(snapshot.ref);
                const docRef = doc(db, `artifacts/${appId}/public/data/${collectionName}`, docId);
                await updateDoc(docRef, { profileImageUrl: downloadURL });
            } catch (error) {
                console.error("Upload failed:", error);
                setUploadError('Η μεταφόρτωση απέτυχε. Ελέγξτε τα δικαιώματα.');
            } finally {
                setIsUploading(false);
                setImageSrc('');
                setOriginalFile(null);
            }
        }, originalFile.type);
    };

    const handleDeleteImage = async () => {
        setOpenConfirmDelete(false);
        const collectionName = channel.type === 'personal' ? 'students' : 'classrooms';
        const docId = channel.id;
        const imageUrlToDelete = profileImageUrl;
        try {
            const storage = getStorage(db.app);
            const imageRef = ref(storage, imageUrlToDelete);
            await deleteObject(imageRef);
            const docRef = doc(db, `artifacts/${appId}/public/data/${collectionName}`, docId);
            await updateDoc(docRef, { profileImageUrl: deleteField() });
        } catch (error) {
            console.error("Error deleting image:", error);
        }
    };

    return (
        <>
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 0, boxShadow: 'none' }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileSelect} />
                    <Box sx={{ position: 'relative', width: 120, height: 120, margin: '16px auto' }}>
                        <Avatar src={profileImageUrl} sx={{ width: 120, height: 120, bgcolor: 'primary.light' }}>
                            {!profileImageUrl && avatarIcon}
                        </Avatar>
                        <Box sx={{ position: 'absolute', bottom: 0, right: 0, display: 'flex', gap: 0.5 }}>
                            <Tooltip title={isUploadDisabled ? '' : "Αλλαγή φωτογραφίας"}>
                                <IconButton size="small" onClick={handleCameraClick} disabled={isUploadDisabled} sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.200' }}}>
                                    {isUploading ? <CircularProgress size={20} /> : <PhotoCameraIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                            {profileImageUrl && (
                                <Tooltip title="Διαγραφή φωτογραφίας">
                                    <IconButton size="small" onClick={() => setOpenConfirmDelete(true)} sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.200' }}}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    </Box>
                    <Typography variant="h5" component="div">{title}</Typography>
                    <Typography sx={{ mb: 2 }} color="text.secondary">{subtitle}</Typography>
                    {uploadError && <Alert severity="error" sx={{mt: 1}}>{uploadError}</Alert>}
                </CardContent>
                <Divider />
                <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
                    <Typography variant="subtitle1" sx={{mb: 1, fontWeight: 'bold'}}>Λεπτομέρειες</Typography>
                    <List dense>
                        {detailsList.map(item => (
                            <ListItem key={item.label} disableGutters>
                                <ListItemIcon sx={{minWidth: '40px'}}>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.label} secondary={item.value} />
                            </ListItem>
                        ))}
                    </List>
                    
                    {channel.type === 'classroom' && enrolledStudents && (
                        <>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle1" sx={{mb: 1, fontWeight: 'bold'}}>Μαθητές ({enrolledStudents.length})</Typography>
                            <List dense sx={{ maxHeight: 'calc(100vh - 550px)', overflowY: 'auto' }}>
                                {enrolledStudents.map(s => {
                                    if (!s) return null;
                                    const isOnline = Math.random() > 0.5; 
                                    const studentName = (s.firstName && s.lastName) ? `${s.firstName} ${s.lastName}` : 'Άγνωστος Μαθητής';
                                    const avatarInitial = s.firstName ? s.firstName.charAt(0) : '?';

                                    return (
                                        <ListItemButton key={s.id} onClick={() => onStudentClick(s)}>
                                            <ListItemIcon sx={{minWidth: '50px'}}>
                                                <StyledBadge
                                                    overlap="circular"
                                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                    variant="dot"
                                                    isOnline={isOnline}
                                                >
                                                    <Avatar src={s.profileImageUrl}>{avatarInitial}</Avatar>
                                                </StyledBadge>
                                            </ListItemIcon>
                                            <ListItemText primary={studentName} />
                                        </ListItemButton>
                                    )
                                })}
                            </List>
                        </>
                    )}
                </Box>
            </Card>
            <Dialog open={openConfirmDelete} onClose={() => setOpenConfirmDelete(false)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent><DialogContentText>Είστε σίγουροι ότι θέλετε να διαγράψετε τη φωτογραφία προφίλ;</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfirmDelete(false)}>Ακύρωση</Button>
                    <Button onClick={handleDeleteImage} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
            
            <Dialog open={openCropModal} onClose={() => setOpenCropModal(false)} maxWidth="sm">
                <DialogTitle>Περικοπή Εικόνας</DialogTitle>
                <DialogContent>
                    {imageSrc && (
                        <ReactCrop
                            crop={crop}
                            onChange={c => setCrop(c)}
                            onComplete={c => setCompletedCrop(c)}
                            aspect={1}
                            circularCrop
                        >
                            <img
                                ref={imgRef}
                                alt="Crop me"
                                src={imageSrc}
                                onLoad={onImageLoad}
                                style={{ maxHeight: '70vh' }}
                            />
                        </ReactCrop>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCropModal(false)}>Ακύρωση</Button>
                    <Button onClick={handleSaveCrop} variant="contained">Αποθήκευση</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
const ReadReceipts = ({ msg, currentUser, participants = [] }) => {
    if (msg.senderId !== currentUser.id) {
        return null;
    }

    const readByCount = msg.readBy?.length || 0;
    const totalRecipients = participants.length > 1 ? participants.length - 1 : 0;

    let ticks;
    let color = 'action.disabled';

    if (totalRecipients > 0 && readByCount >= totalRecipients) {
        ticks = <DoneAllIcon sx={{ fontSize: '1rem' }} />;
        color = 'primary.main';
    } else if (readByCount > 0) {
        ticks = <DoneAllIcon sx={{ fontSize: '1rem' }} />;
    } else {
        ticks = <DoneIcon sx={{ fontSize: '1rem' }} />;
    }

    return (
        <Box sx={{ color, display: 'inline-flex', alignItems: 'center', ml: 0.5 }}>
            {ticks}
        </Box>
    );
};
const ChatMessage = ({ msg, onReplyClick, onDeleteClick, currentUser, participants }) => {
    const { mode } = useTheme();
    const isMe = msg.position === 'right';

    const bubbleColor = useMemo(() => {
        if (isMe) {
            return mode === 'light' ? blue[100] : blue[800];
        } else {
            return mode === 'light' ? green[100] : green[800];
        }
    }, [isMe, mode]);

    const MessageContent = () => {
        switch (msg.type) {
            case 'photo':
                if (!msg.data?.uri) return <Typography color="error.main" variant="body2">[Missing Photo Data]</Typography>;
                return (
                    <Link href={msg.data.uri} target="_blank" rel="noopener noreferrer">
                        <Box
                            component="img"
                            src={msg.data.uri}
                            alt={msg.text || 'photo'}
                            sx={{
                                maxWidth: '100%',
                                maxHeight: 300,
                                borderRadius: '12px',
                                mt: 1
                            }}
                        />
                    </Link>
                );
            case 'file':
                 if (!msg.data?.uri) return <Typography color="error.main" variant="body2">[Missing File Data]</Typography>;
                return (
                    <Paper
                        variant="outlined"
                        sx={{
                            mt: 1,
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            maxWidth: 300,
                            bgcolor: 'transparent', 
                            border: '1px solid rgba(0,0,0,0.1)'
                        }}
                    >
                        <FileIcon />
                        <Link href={msg.data.uri} target="_blank" rel="noopener noreferrer" underline="hover">
                            <Typography variant="body2">{msg.data.fileName || 'Αρχείο'}</Typography>
                        </Link>
                    </Paper>
                );
            default:
                return <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</Typography>;
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: isMe ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                mb: 2,
                gap: 1.5,
            }}
        >
            <Avatar src={msg.avatar || ''} />
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{isMe ? 'Me' : msg.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {msg.date ? dayjs(msg.date).format('DD MMM, HH:mm') : ''}
                    </Typography>
                    {isMe && <ReadReceipts msg={msg} currentUser={currentUser} participants={participants} />}
                </Box>
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: '12px',
                        bgcolor: bubbleColor,
                        position: 'relative',
                        maxWidth: '500px',
                    }}
                >
                    {msg.reply && (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 1,
                                mb: 1,
                                bgcolor: 'rgba(0, 0, 0, 0.05)',
                                borderLeft: '3px solid',
                                borderColor: 'primary.main',
                                opacity: 0.8
                            }}
                        >
                            <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                                {msg.reply.title}
                            </Typography>
                            <Typography variant="body2" noWrap>
                                {msg.reply.text || (msg.reply.data?.fileName || '')}
                            </Typography>
                        </Paper>
                    )}
                    <MessageContent />
                </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                {isMe && (
                    <IconButton size="small" onClick={() => onDeleteClick(msg)} sx={{ opacity: 0.3, '&:hover': { opacity: 1 } }}>
                        <DeleteIcon fontSize="inherit" />
                    </IconButton>
                )}
                <IconButton size="small" onClick={() => onReplyClick(msg)} sx={{ opacity: 0.3, '&:hover': { opacity: 1 } }}>
                    <ReplyIcon fontSize="inherit" />
                </IconButton>
            </Box>
        </Box>
    );
};


// --- ΑΛΛΑΓΗ: Προσθήκη του `allTeachers` στα props ---
function Communication({ db, appId, allStudents, classrooms, allTeachers, userId }) {
    const location = useLocation(); // <-- ΝΕΑ ΕΙΣΑΓΩΓΗ
    const { mode } = useTheme();
    const [selectedChannel, setSelectedChannel] = useState({ id: 'global', type: 'global', title: 'Γενική Ανακοίνωση' });
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true);
    const [inputText, setInputText] = useState(""); 
    const messageListRef = useRef(null);
    const fileInputRef = useRef(null);
    const [openSections, setOpenSections] = useState({ classrooms: true, students: true, teachers: true });
    const [replyingTo, setReplyingTo] = useState(null);
    const [messageToDelete, setMessageToDelete] = useState(null);

    const handleToggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const currentUser = useMemo(() => ({
        id: userId || 'admin_id',
        name: 'Me' 
    }), [userId]);
    
    // --- ΑΛΛΑΓΗ: Το `allUsersMap` περιλαμβάνει πλέον και τους καθηγητές ---
    const allUsersMap = useMemo(() => {
        const map = new Map();
        if(allStudents) {
            allStudents.forEach(s => map.set(s.id, { name: `${s.lastName} ${s.firstName}`, avatar: s.profileImageUrl }));
        }
        if(allTeachers) {
            allTeachers.forEach(t => map.set(t.id, { name: `${t.firstName} ${t.lastName}`, avatar: t.profileImageUrl }));
        }
        map.set(currentUser.id, { name: currentUser.name, avatar: null });
        return map;
    }, [allStudents, allTeachers, currentUser]);


    useEffect(() => {
        if (!db || !appId) return;
        setLoadingMessages(true);
        const messagesRef = collection(db, `artifacts/${appId}/public/data/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allMessages = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data(), date: doc.data().timestamp?.toDate()
            }));
            setMessages(allMessages);
            setLoadingMessages(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoadingMessages(false);
        });
        return () => unsubscribe();
    }, [db, appId]);

    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages, selectedChannel]);

    const messagesForChannel = useMemo(() => {
        if (!selectedChannel) return [];
        return messages
            .filter(m => m.channelId === selectedChannel.id)
            .map(msg => {
                const senderInfo = allUsersMap.get(msg.senderId);
                return {
                    ...msg,
                    position: msg.senderId === currentUser.id ? 'right' : 'left',
                    type: msg.type || 'text',
                    title: senderInfo?.name || 'Unknown User',
                    avatar: senderInfo?.avatar
                };
            });
    }, [messages, selectedChannel, currentUser.id, allUsersMap]);

    useEffect(() => {
        if (!db || !appId || !selectedChannel || !currentUser.id || messagesForChannel.length === 0) {
            return;
        }

        const markMessagesAsRead = async () => {
            const batch = writeBatch(db);
            let updatesMade = false;

            messagesForChannel.forEach(msg => {
                if (msg.senderId !== currentUser.id && (!msg.readBy || !msg.readBy.includes(currentUser.id))) {
                    const msgRef = doc(db, `artifacts/${appId}/public/data/messages`, msg.id);
                    batch.update(msgRef, {
                        readBy: arrayUnion(currentUser.id)
                    });
                    updatesMade = true;
                }
            });

            if (updatesMade) {
                try {
                    await batch.commit();
                } catch (error) {
                    console.error("Error marking messages as read:", error);
                }
            }
        };
        
        const timeoutId = setTimeout(markMessagesAsRead, 1500);
        return () => clearTimeout(timeoutId);

    }, [db, appId, currentUser.id, selectedChannel, messagesForChannel]);


    const createMessageInDb = async (messageData) => {
        const messagesRef = collection(db, `artifacts/${appId}/public/data/messages`);
        await addDoc(messagesRef, {
            ...messageData,
            senderId: currentUser.id,
            timestamp: serverTimestamp(),
            channelId: selectedChannel.id,
            channelType: selectedChannel.type,
            readBy: [],
        });
    };

    const handleSendMessage = async () => {
        const textToSend = String(inputText || '').trim();
        if (!textToSend || !selectedChannel) return;
        setIsSending(true);
        try {
            const messagePayload = { type: 'text', text: textToSend };
            if (replyingTo) {
                messagePayload.reply = {
                    title: allUsersMap.get(replyingTo.senderId)?.name || 'Unknown User',
                    text: replyingTo.text || (replyingTo.data?.fileName || ''),
                    messageId: replyingTo.id,
                };
            }
            await createMessageInDb(messagePayload);
            setInputText(""); 
            setReplyingTo(null);
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const storage = getStorage(db.app);
        const storagePath = `chat_attachments/${selectedChannel.id}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);
        uploadTask.on('state_changed', 
            (snapshot) => {}, 
            (error) => { console.error("Upload failed:", error); }, 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const messageType = file.type.startsWith('image/') ? 'photo' : 'file';
                const messagePayload = {
                    type: messageType,
                    text: file.name,
                    data: {
                        uri: downloadURL,
                        storagePath: storagePath,
                        status: { click: false, download: true },
                        size: file.size, fileName: file.name,
                    }
                };
                 if (replyingTo) {
                    messagePayload.reply = {
                        title: allUsersMap.get(replyingTo.senderId)?.name || 'Unknown User',
                        text: replyingTo.text || (replyingTo.data?.fileName || ''),
                        messageId: replyingTo.id,
                    };
                }
                await createMessageInDb(messagePayload);
                setReplyingTo(null);
            }
        );
        event.target.value = null;
    };
    
    const handleReplyClick = (message) => {
        setReplyingTo(message);
    };

    const handleDeleteMessage = async () => {
        if (!messageToDelete) return;

        try {
            if ((messageToDelete.type === 'photo' || messageToDelete.type === 'file') && messageToDelete.data?.storagePath) {
                const storage = getStorage(db.app);
                const fileRef = ref(storage, messageToDelete.data.storagePath);
                await deleteObject(fileRef);
            }
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/messages`, messageToDelete.id));

        } catch (error) {
            console.error("Error deleting message:", error);
        } finally {
            setMessageToDelete(null);
        }
    };

    const globalChannel = useMemo(() => [{
        id: 'global', type: 'global', avatar: null, title: 'Γενική Ανακοίνωση',
        subtitle: 'Μηνύματα προς όλους', date: null, unread: 0,
    }], []);

    const classroomChannels = useMemo(() => (classrooms || []).filter(c => c.classroomName.toLowerCase().includes(searchTerm.toLowerCase())).map(c => ({
        id: c.id, type: 'classroom', avatar: c.profileImageUrl || null,
        title: c.classroomName, subtitle: c.subject, date: null, unread: 0,
    })), [classrooms, searchTerm]);

    const studentChannels = useMemo(() => (allStudents || []).filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())).map(s => ({
        id: s.id, type: 'personal', avatar: s.profileImageUrl || null,
        title: `${s.lastName} ${s.firstName}`, subtitle: s.grade, date: null, unread: 0,
    })), [allStudents, searchTerm]);
    
    // --- ΝΕΑ ΛΟΓΙΚΗ: Δημιουργία καναλιών για τους καθηγητές ---
    const teacherChannels = useMemo(() => (allTeachers || []).filter(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())).map(t => ({
        id: t.id, type: 'personal', avatar: t.profileImageUrl || null,
        title: `${t.firstName} ${t.lastName}`, subtitle: t.specialty || 'Καθηγητής', date: null, unread: 0,
    })), [allTeachers, searchTerm]);

    // --- ΝΕΟ EFFECT: Ελέγχει το state της πλοήγησης για να προ-επιλέξει συνομιλία ---
    useEffect(() => {
        const channelId = location.state?.selectedChannelId;
        if (channelId) {
            const allPersonalChannels = [...studentChannels, ...teacherChannels];
            const channelToSelect = allPersonalChannels.find(c => c.id === channelId);
            if (channelToSelect) {
                setSelectedChannel(channelToSelect);
            }
        }
    }, [location.state, studentChannels, teacherChannels]);

    
    const selectedStudentDetails = useMemo(() => (selectedChannel?.type === 'personal') ? allStudents.find(s => s.id === selectedChannel.id) : null, [selectedChannel, allStudents]);
    const selectedClassroomDetails = useMemo(() => (selectedChannel?.type === 'classroom') ? classrooms.find(c => c.id === selectedChannel.id) : null, [selectedChannel, classrooms]);
    
    const enrolledStudentsForClassroom = useMemo(() => {
        if (!selectedClassroomDetails || !allStudents) return [];
        return allStudents.filter(s => selectedClassroomDetails.enrolledStudents?.includes(s.id));
    }, [selectedClassroomDetails, allStudents]);

    const channelParticipants = useMemo(() => {
        if (!selectedChannel) return [];
        if (selectedChannel.type === 'personal') {
            return [currentUser.id, selectedChannel.id];
        }
        if (selectedChannel.type === 'classroom') {
            const classroom = classrooms.find(c => c.id === selectedChannel.id);
            return [currentUser.id, ...(classroom?.enrolledStudents || [])];
        }
        if (selectedChannel.type === 'global') {
            return [currentUser.id, ...allStudents.map(s => s.id)];
        }
        return [currentUser.id];
    }, [selectedChannel, classrooms, allStudents, currentUser.id]);

    const handleStudentClick = (student) => {
        const studentChannel = studentChannels.find(c => c.id === student.id);
        if (studentChannel) {
            setSelectedChannel(studentChannel);
        }
    };

    const renderChannelList = (channels) => (
        <List component="div" disablePadding>
            {channels.map(channel => (
                <ListItemButton
                    key={channel.id}
                    selected={selectedChannel?.id === channel.id}
                    onClick={() => setSelectedChannel(channel)}
                >
                    <ListItemAvatar>
                        <Avatar src={channel.avatar}>{channel.title.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={channel.title} secondary={channel.subtitle} />
                </ListItemButton>
            ))}
        </List>
    );

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 120px)', p: '0 !important' }}>
            <Grid container sx={{ height: '100%', flexWrap: 'nowrap' }}>
                <Grid item xs={12} md={3} sx={{ height: '100%', borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                    <Paper elevation={0} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="h6">Συνομιλίες</Typography>
                         <MuiTextField fullWidth variant="standard" size="small" placeholder="Αναζήτηση..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} sx={{mt: 1}} />
                    </Paper>
                    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        <List component="nav">
                            <ListSubheader>Γενικά</ListSubheader>
                            {renderChannelList(globalChannel)}
                            
                            <ListItemButton onClick={() => handleToggleSection('classrooms')}>
                                <ListItemIcon><PeopleIcon /></ListItemIcon>
                                <ListItemText primary="Τμήματα" />
                                {openSections.classrooms ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                            <Collapse in={openSections.classrooms} timeout="auto" unmountOnExit>
                                {renderChannelList(classroomChannels)}
                            </Collapse>

                            {/* --- ΝΕΑ ΕΝΟΤΗΤΑ: Καθηγητές --- */}
                            {teacherChannels.length > 0 && (
                                <>
                                    <ListItemButton onClick={() => handleToggleSection('teachers')}>
                                        <ListItemIcon><TeacherIcon /></ListItemIcon>
                                        <ListItemText primary="Καθηγητές" />
                                        {openSections.teachers ? <ExpandLess /> : <ExpandMore />}
                                    </ListItemButton>
                                    <Collapse in={openSections.teachers} timeout="auto" unmountOnExit>
                                        {renderChannelList(teacherChannels)}
                                    </Collapse>
                                </>
                            )}

                            <ListItemButton onClick={() => handleToggleSection('students')}>
                                <ListItemIcon><PersonIcon /></ListItemIcon>
                                <ListItemText primary="Μαθητές" />
                                {openSections.students ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                            <Collapse in={openSections.students} timeout="auto" unmountOnExit>
                                {renderChannelList(studentChannels)}
                            </Collapse>
                        </List>
                    </Box>
                </Grid>

                <Grid item xs={12} md={isInfoPanelOpen ? 6 : 9} sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease-in-out' }}>
                    {selectedChannel ? (
                        <>
                            <Paper elevation={0} sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h6" sx={{flexGrow: 1}}>{selectedChannel.title}</Typography>
                                <Tooltip title={isInfoPanelOpen ? "Απόκρυψη Πληροφοριών" : "Εμφάνιση Πληροφοριών"}>
                                    <IconButton onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)}>
                                        {isInfoPanelOpen ? <ChevronRightIcon /> : <InfoIcon />}
                                    </IconButton>
                                </Tooltip>
                            </Paper>
                            <Box ref={messageListRef} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: mode === 'dark' ? 'background.default' : colors.grey[50] }}>
                                {messagesForChannel.map(msg => (
                                    <ChatMessage key={msg.id} msg={msg} onReplyClick={handleReplyClick} onDeleteClick={setMessageToDelete} currentUser={currentUser} participants={channelParticipants} />
                                ))}
                                {messagesForChannel.length === 0 && !loadingMessages && (<SystemMessage text="Δεν υπάρχουν μηνύματα σε αυτή τη συνομιλία." />)}
                            </Box>
                            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                                {replyingTo && (
                                    <Paper variant="outlined" sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover' }}>
                                        <Box>
                                            <Typography variant="caption" color="primary" sx={{fontWeight: 'bold'}}>Απάντηση σε: {allUsersMap.get(replyingTo.senderId)?.name || 'Unknown'}</Typography>
                                            <Typography variant="body2" noWrap sx={{opacity: 0.8}}>{replyingTo.text || (replyingTo.data?.fileName || '')}</Typography>
                                        </Box>
                                        <IconButton size="small" onClick={() => setReplyingTo(null)}><CloseIcon fontSize="small" /></IconButton>
                                    </Paper>
                                )}
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <input type="file" ref={fileInputRef} hidden onChange={handleFileSelected} />
                                    <IconButton onClick={() => fileInputRef.current.click()}><AttachFileIcon /></IconButton>
                                    <MuiTextField fullWidth variant="outlined" size="small" placeholder="Γράψτε το μήνυμά σας..." multiline maxRows={4} value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                        disabled={isSending}
                                    />
                                    <Button variant="contained" onClick={handleSendMessage} disabled={isSending || !inputText.trim()}>
                                        <SendIcon />
                                    </Button>
                                </Box>
                            </Box>
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                            <Typography>Επιλέξτε μια συνομιλία για να ξεκινήσετε.</Typography>
                        </Box>
                    )}
                </Grid>
                
                <Grid 
                    item 
                    md={isInfoPanelOpen ? 3 : 0}
                    sx={{ 
                        height: '100%', 
                        borderLeft: isInfoPanelOpen ? 1 : 0,
                        borderColor: 'divider', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        bgcolor: 'background.paper',
                        transition: 'all 0.3s ease-in-out',
                        overflow: 'hidden',
                        width: isInfoPanelOpen ? 'auto' : 0,
                        minWidth: isInfoPanelOpen ? '280px' : 0,
                    }}
                >
                    <InfoCard 
                        channel={selectedChannel}
                        student={selectedStudentDetails}
                        classroom={selectedClassroomDetails}
                        enrolledStudents={enrolledStudentsForClassroom}
                        onStudentClick={handleStudentClick}
                        db={db}
                        appId={appId}
                    />
                </Grid>
            </Grid>
            <Dialog open={!!messageToDelete} onClose={() => setMessageToDelete(null)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το μήνυμα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMessageToDelete(null)}>Ακύρωση</Button>
                    <Button onClick={handleDeleteMessage} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default Communication;
