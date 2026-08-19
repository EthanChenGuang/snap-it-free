import React, { useState } from 'react';
import { ChatMessage, Item } from '../types';

interface ChatModalProps {
  item: Item;
  messages: ChatMessage[];
  onSendMessage: (itemId: string, text: string) => void;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  item,
  messages,
  onSendMessage,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');

  const quickReplies = [
    'Hi! Is this still available for pickup?',
    'I can pick this up this weekend!',
    'What time works best for you?',
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;
    onSendMessage(item.id, text.trim());
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-xl sm:rounded-md border border-[#ececec] flex flex-col h-[80vh] sm:h-[580px] shadow-lg overflow-hidden">
        {/* Chat Header */}
        <div className="p-3 border-b border-[#ececec] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#fbfbfa] border border-[#ececec] shrink-0">
              <img
                src={item.owner.avatar}
                alt={item.owner.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                {item.owner.name}
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              </p>
              <p className="text-[11px] text-[#91918e] truncate max-w-[200px]">Re: {item.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#efefed] rounded text-[#91918e] hover:text-[#37352f] cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Item Preview Bar */}
        <div className="px-3 py-2 bg-[#fbfbfa] border-b border-[#ececec] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={item.imageUrl} alt="" className="w-7 h-7 rounded object-cover border border-[#ececec]" />
            <span className="text-xs font-semibold text-[#37352f] truncate max-w-[220px]">
              {item.title}
            </span>
          </div>
          <span className="text-xs font-bold text-[#df6b05] bg-[#fff5eb] px-1.5 py-0.5 rounded border border-[#fde3cf]">{item.cost}</span>
        </div>

        {/* Message History */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#fbfbfa]">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-[#91918e] text-xs">
              Start a conversation with {item.owner.name} to arrange pickup details.
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-md px-3 py-2 text-xs shadow-2xs ${
                      isUser
                        ? 'bg-[#37352f] text-white rounded-br-none'
                        : 'bg-white border border-[#ececec] text-[#37352f] rounded-bl-none'
                    }`}
                  >
                    <p className="leading-relaxed font-medium">{msg.text}</p>
                    <p
                      className={`text-[9px] mt-1 text-right ${
                        isUser ? 'text-white/70' : 'text-[#91918e]'
                      }`}
                    >
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Replies */}
        <div className="px-3 py-2 bg-white border-t border-[#ececec] flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSend(reply)}
              className="px-2.5 py-1 text-[11px] font-medium bg-[#fbfbfa] hover:bg-[#efefed] text-[#37352f] rounded border border-[#ececec] whitespace-nowrap cursor-pointer transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-[#ececec] flex gap-2 items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Message ${item.owner.name}...`}
            className="flex-1 px-3 py-1.5 border border-[#ececec] rounded-md text-xs text-[#37352f] outline-none focus:border-[#37352f] transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="p-1.5 bg-[#37352f] text-white rounded-md hover:bg-black disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
