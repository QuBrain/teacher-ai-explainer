from google import genai
from google.genai import types

f=open("../System_Prompt.md", "r", encoding="utf-8")
system_insts=f.read()
# print(system_insts)


client=genai.Client()

planner_config=types.GenerateContentConfig(
     system_instruction=system_insts,
     temperature=0.05
 )
stream_config=types.GenerateContentConfig(
     system_instruction="You are a Professor. Answer the student's query in an encouraging and professional tone",
     temperature=0.8
 )
# thinking model

def professor_sesssion(student_query):
    response_thinking_model=client.models.generate_content(
        model='gemini-2.5-pro',
        contents=student_query,
        config=planner_config
    )
    stream=client.models.generate_content(
        model='gemini-2.5-flash',
        config=stream_config,
        contents=[f"The plan is: {response_thinking_model.text}", f"The student asked: {student_query}"]
    )
    print(stream.text)
    
professor_sesssion('Explain LQR in control theory basics')

