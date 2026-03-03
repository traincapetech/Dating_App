
def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    tags = []
    # Simplified tag seeker
    import re
    # Find <View, </View, <Pressable, </Pressable, <Text, </Text
    pattern = re.compile(r'<(/?View|/?Pressable|/?Text)')
    matches = pattern.findall(content)
    
    stack = []
    for tag in matches:
        if tag.startswith('/'):
            if not stack:
                print(f"Error: popped empty stack with {tag}")
            else:
                top = stack.pop()
                if top != tag[1:]:
                    print(f"Mismatch: {top} vs {tag}")
        else:
            stack.append(tag)
    
    if stack:
        print(f"Remaining on stack: {stack}")
    else:
        print("Balanced!")

check_balance('d:/Mohit_pryvo/Dating_App/src/features/messages/screens/ChatsScreen.jsx')
